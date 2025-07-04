# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Settings::ScopedSettings do
  let(:object)         { Fabricate(:user) }
  let(:scoped_setting) { described_class.new(object) }
  let(:val)            { 'whatever' }
  let(:methods)        { %i(auto_play_avatar auto_play_header auto_play_emoji auto_play_media default_sensitive follow_modal unfollow_modal subscribe_modal unsubscribe_modal follow_tag_modal unfollow_tag_modal boost_modal delete_modal reduce_motion system_font_ui noindex theme) }

  describe '.initialize' do
    it 'sets @object' do
      scoped_setting = described_class.new(object)
      expect(scoped_setting.instance_variable_get(:@object)).to be object
    end
  end

  describe '#method_missing' do
    it 'sets scoped_setting.method_name = val' do
      methods.each do |key|
        scoped_setting.send("#{key}=", val)
        expect(scoped_setting.send(key)).to eq val
      end
    end
  end

  describe '#[]= and #[]' do
    it 'sets [key] = val' do
      methods.each do |key|
        scoped_setting[key] = val
        expect(scoped_setting[key]).to eq val
      end
    end
  end
end
