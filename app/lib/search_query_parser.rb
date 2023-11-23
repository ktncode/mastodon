# frozen_string_literal: true

class SearchQueryParser < Parslet::Parser
  rule(:term)      { match('[^[:space:]"]').repeat(1).as(:term) }
  rule(:aterm)     { match('[^[:space:],"]').repeat(1).as(:term) }
  rule(:quote)     { str('"') }
  rule(:colon)     { str(':') }
  rule(:comma)     { str(',') }
  rule(:space)     { match('[[:space:]]').repeat(1) }
  rule(:terms)     { (aterm >> comma.maybe).repeat(2).as(:terms) }
  rule(:operator)  { (str('+') | str('-')).as(:operator) }
  rule(:prefix)    { match('[^[:space:]":]').repeat(1).as(:term) >> colon }
  rule(:shortcode) { (colon >> term >> colon.maybe).as(:shortcode) }
  rule(:phrase)    { (quote >> (match('[^[:space:]"]').repeat(1).as(:term) >> space.maybe).repeat >> quote).as(:phrase) }
  rule(:phrases)   { (phrase >> comma.maybe).repeat(2).as(:phrases) }
  rule(:clause)    { (operator.maybe >> prefix.maybe.as(:prefix) >> (phrases | phrase | terms | term | shortcode)).as(:clause) | prefix.as(:clause) | quote.as(:junk) }
  rule(:query)     { (clause >> space.maybe).repeat.as(:query) }
  root(:query)
end
