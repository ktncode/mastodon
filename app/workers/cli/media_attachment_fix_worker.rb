# frozen_string_literal: true

class Cli::MediaAttachmentFixWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'maintenance', backtrace: true, retry: false, dead: true, lock: :until_executed

  def perform(status_id, options = {})
    status  = Status.include_expired.with_includes.find(status_id)
    options = {small: false, tiny: false}.merge(options.symbolize_keys!)

    return nil unless status.account_domain.nil? || DeliveryFailureTracker.available?(status.account_domain)

    status.media_attachments.each do |media|
      process = []
      process << :small if options[:small]
      process << :tiny if options[:tiny]

      if media.exists?
        media.file.reprocess!(process) if process.present?
      else
        media.reset_file!
      end

      media.save!
    rescue
      next
    end
  rescue
    true
  end
end
