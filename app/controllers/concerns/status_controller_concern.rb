# frozen_string_literal: true

module StatusControllerConcern
  extend ActiveSupport::Concern

  ANCESTORS_LIMIT         = 40
  DESCENDANTS_LIMIT       = 60
  DESCENDANTS_DEPTH_LIMIT = 20
  REFERENCES_LIMIT        = 60

  def create_descendant_thread(starting_depth, statuses)
    depth = starting_depth + statuses.size

    if depth < DESCENDANTS_DEPTH_LIMIT
      {
        statuses: statuses,
        starting_depth: starting_depth,
      }
    else
      next_status = statuses.pop

      {
        statuses: statuses,
        starting_depth: starting_depth,
        next_status: next_status,
      }
    end
  end

  def limit_param(default_limit)
    return default_limit unless params[:limit]

    [params[:limit].to_i.abs, default_limit * 2].min
  end

  def set_references
    limit  = limit_param(REFERENCES_LIMIT)
    max_id = params[:max_id]&.to_i
    min_id = params[:min_id]&.to_i

    @references = references = cache_collection(
      @status.thread_references(
        DESCENDANTS_LIMIT,
        current_account,
        params[:max_descendant_thread_id]&.to_i,
        params[:since_descendant_thread_id]&.to_i,
        DESCENDANTS_DEPTH_LIMIT
      ),
      Status
    )
    .sort_by {|status| status.id}.reverse

    return if references.empty?

    @references = begin
      if min_id
        references.drop_while {|status| status.id >= min_id }.take(limit)
      elsif max_id
        references.take_while {|status| status.id > max_id }.reverse.take(limit).reverse
      else
        references.take(limit)
      end
    end

    return if @references.empty?

    @max_id = @references.first&.id if @references.first.id != references.first.id
    @min_id = @references.last&.id  if @references.last.id  != references.last.id
  end

  def set_ancestors
    @references = @status.thread_references(
      DESCENDANTS_LIMIT,
      current_account&.id,
      params[:max_descendant_thread_id]&.to_i,
      params[:since_descendant_thread_id]&.to_i,
      DESCENDANTS_DEPTH_LIMIT
    )

    @ancestors = cache_collection(
      @status.ancestors(ANCESTORS_LIMIT, current_account&.id) + @references,
      Status
    ).sort_by{|status| status.id}.take(ANCESTORS_LIMIT)

    @next_ancestor = @ancestors.size < ANCESTORS_LIMIT ? nil : @ancestors.shift
  end

  def set_descendants
    @max_descendant_thread_id   = params[:max_descendant_thread_id]&.to_i
    @since_descendant_thread_id = params[:since_descendant_thread_id]&.to_i

    descendants = cache_collection(
      @status.descendants(
        DESCENDANTS_LIMIT,
        current_account&.id,
        @max_descendant_thread_id,
        @since_descendant_thread_id,
        DESCENDANTS_DEPTH_LIMIT
      ),
      Status
    )

    @descendant_threads = []

    if descendants.present?
      statuses       = [descendants.first]
      starting_depth = 0

      descendants.drop(1).each_with_index do |descendant, index|
        if descendants[index].id == descendant.in_reply_to_id
          statuses << descendant
        else
          @descendant_threads << create_descendant_thread(starting_depth, statuses)

          # The thread is broken, assume it's a reply to the root status
          starting_depth = 0

          # ... unless we can find its ancestor in one of the already-processed threads
          @descendant_threads.reverse_each do |descendant_thread|
            statuses = descendant_thread[:statuses]

            index = statuses.find_index do |thread_status|
              thread_status.id == descendant.in_reply_to_id
            end

            if index.present?
              starting_depth = descendant_thread[:starting_depth] + index + 1
              break
            end
          end

          statuses = [descendant]
        end
      end

      @descendant_threads << create_descendant_thread(starting_depth, statuses)
    end

    @max_descendant_thread_id = @descendant_threads.pop[:statuses].first.id if descendants.size >= DESCENDANTS_LIMIT
  end
end
