# frozen_string_literal: true

module NodeHelper
  def default_thumbnail(server)
    url = case server.software_name
    when 'mastodon'
      asset_pack_path('media/images/preview.jpg')
    else
      nil
    end

    if url.present?
      image_tag(url, alt: '')
    else
      nil
    end
  end

  def server_theme_color_params(server, **options)
    result = options || {}
    result.merge!({ 'data-domain': server.domain })

    @theme_color_inline_styles ||= {}
    @theme_color_inline_styles[server.domain] = server.theme_color if server.theme_color

    result.merge!({ class: [options[:class], 'with-theme-color'].compact.join(' ') })
  end

  def server_theme_color_styles
    return if @theme_color_inline_styles.nil?

    @theme_color_inline_styles.map do |domain, color|
      ".with-theme-color[data-domain=\"#{h(domain)}\"] { --theme-color: #{h(color)}; }"
    end.join("\n")
  end
end
