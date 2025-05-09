class AutoPlayGifSettingToMAvatarHeaderEmojiMedia < ActiveRecord::Migration[6.1]
  def up
    User.find_each do |user|
      auto_play = user.settings['auto_play_gif']
      user.settings['auto_play_avatar'] = auto_play
      user.settings['auto_play_header'] = auto_play
      user.settings['auto_play_emoji'] = auto_play
      user.settings['auto_play_media'] = auto_play
    end
  end

  def down
    User.find_each do |user|
      auto_play = user.settings['auto_play_avatar'] && user.settings['auto_play_header'] && user.settings['auto_play_emoji'] && user.settings['auto_play_media']
      user.settings['auto_play_gif'] = auto_play
    end
  end
end
