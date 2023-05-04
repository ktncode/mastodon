class AddThumbhashToMediaAttachments < ActiveRecord::Migration[6.1]
  def change
    add_column :media_attachments, :thumbhash, :string
  end
end
