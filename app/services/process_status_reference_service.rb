# frozen_string_literal: true

class ProcessStatusReferenceService
  def call(status, **options)
    @status = status

    urls = (parse_urls(status, options).union(options[:urls]) - [ActivityPub::TagManager.instance.uri_for(status), ActivityPub::TagManager.instance.url_for(status)]).compact

    return urls if options[:skip_process]

    process_reference(urls, (options[:status_reference_ids] || []).compact.uniq, status.id)
  end

  private

  def parse_urls(status, **options)
    if status.local?
      parse_local_urls(status.text)
    else
      mentions = options[:mentions] || status.mentions
      parse_remote_urls(status.text, mentions)
    end
  end

  def process_reference(urls, ids, status_id)
    target_statuses = urls_to_target_statuses(urls, status_id).uniq
    target_statuses = target_statuses + Status.where(id: ids - target_statuses.map(&:id)).where(visibility: [:public, :unlisted, :private])

    references = target_statuses.filter_map do |target_status|
      StatusReference.create(status_id: status_id, target_status_id: target_status.id)
    end

    references.group_by{|reference| reference.target_status.account}.each do |account, grouped_references|
      create_notification(grouped_references.sort_by(&:id).first) if account.local?
    end
  end

  def create_notification(reference)
    NotifyService.new.call(reference.target_status.account, :status_reference, reference)
  end

  def parse_local_urls(text)
    text.scan(FetchLinkCardService::URL_PATTERN).map(&:second).uniq.filter_map do |url|
      Addressable::URI.parse(url).normalize.to_s
    rescue Addressable::URI::InvalidURIError
      nil
    end
  end

  def parse_remote_urls(text, mentions = [])
    html  = Nokogiri::HTML(text)
    links = html.css(':not(.reference-link-inline) > a')

    links.filter_map do |anchor|
      Addressable::URI.parse(anchor['href'])&.normalize&.to_s unless skip_link?(anchor, mentions)
    rescue Addressable::URI::InvalidURIError, IDN::Idna::IdnaError
      nil
    end
  end

  def urls_to_target_statuses(urls, status_id)
    urls.uniq.filter_map do |url|
      url_to_target_status(url).tap do |target_status|
        if target_status.nil? && !TagManager.instance.local_url?(url)
          StatusReferenceResolveWorker.perform_async(status_id, url)
        end
      end
    end
  end

  def url_to_target_status(url)
    if TagManager.instance.local_url?(url)
      ActivityPub::TagManager.instance.uri_to_resource(url, Status)
    else
      EntityCache.instance.holding_status(url)
    end
  end

  def mention_link?(anchor, mentions)
    mentions.any? do |mention|
      anchor['href'] == ActivityPub::TagManager.instance.url_for(mention.account)
    end
  end

  def skip_link?(anchor, mentions)
    # Avoid links for hashtags and mentions (microformats)
    anchor['rel']&.include?('tag') || anchor['class']&.match?(/u-url|h-card/) || mention_link?(anchor, mentions)
  end
end
  