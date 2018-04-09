# == Schema Information
#
# Table name: timeframes
#
#  id         :integer          not null, primary key
#  plan_id    :integer
#  start      :date
#  end        :date
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class Timeframe < ApplicationRecord
  belongs_to :plan
  has_many :segments
  validates :start, presence: true
  validates :end, presence: true
  validates :plan_id, presence: true
  accepts_nested_attributes_for :segments
end
