import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl, FormattedMessage, FormattedDate } from 'react-intl';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { me } from 'mastodon/initial_state';
import Icon from 'mastodon/components/icon';
import AccountNoteContainer from '../containers/account_note_container';
import age from 's-age';
import classNames from 'classnames';

const messages = defineMessages({
  linkVerifiedOn: { id: 'account.link_verified_on', defaultMessage: 'Ownership of this link was checked on {date}' },
});

const dateFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
};

export default @injectIntl
class HeaderExtra extends ImmutablePureComponent {

  static propTypes = {
    account: ImmutablePropTypes.map,
    identity_proofs: ImmutablePropTypes.list,
    intl: PropTypes.object.isRequired,
  };

  isStatusesPageActive = (match, location) => {
    if (!match) {
      return false;
    }

    return !location.pathname.match(/\/(followers|following)\/?$/);
  }

  render () {
    const { account, intl, identity_proofs } = this.props;

    if (!account) {
      return null;
    }

    const suspended = account.get('suspended');

    const content = { __html: account.get('note_emojified') };
    const fields  = account.get('fields');

    const location = account.getIn(['other_settings', 'location']);
    const birthday = account.getIn(['other_settings', 'birthday']);
    const joined = account.get('created_at');

    return (
      <div className={classNames('account__header', 'advanced', { inactive: !!account.get('moved') })}>
        <div className='account__header__extra'>
          <div className='account__header__bio'>
            {(fields.size > 0 || identity_proofs.size > 0) && (
              <div className='account__header__fields'>
                {identity_proofs.map((proof, i) => (
                  <dl key={i}>
                    <dt dangerouslySetInnerHTML={{ __html: proof.get('provider') }} />

                    <dd className='verified'>
                      <a href={proof.get('proof_url')} target='_blank' rel='noopener noreferrer'><span title={intl.formatMessage(messages.linkVerifiedOn, { date: intl.formatDate(proof.get('updated_at'), dateFormatOptions) })}>
                        <Icon id='check' className='verified__mark' />
                      </span></a>
                      <a href={proof.get('profile_url')} target='_blank' rel='noopener noreferrer'><span dangerouslySetInnerHTML={{ __html: ' '+proof.get('provider_username') }} /></a>
                    </dd>
                  </dl>
                ))}
                {fields.map((pair, i) => (
                  <dl key={i}>
                    <dt dangerouslySetInnerHTML={{ __html: pair.get('name_emojified') }} title={pair.get('name')} className='translate' />

                    <dd className={`${pair.get('verified_at') ? 'verified' : ''} translate`} title={pair.get('value_plain')}>
                      {pair.get('verified_at') && <span title={intl.formatMessage(messages.linkVerifiedOn, { date: intl.formatDate(pair.get('verified_at'), dateFormatOptions) })}><Icon id='check' className='verified__mark' /></span>} <span dangerouslySetInnerHTML={{ __html: pair.get('value_emojified') }} />
                    </dd>
                  </dl>
                ))}
              </div>
            )}

            {account.get('id') !== me && !suspended && <AccountNoteContainer account={account} />}

            {account.get('note').length > 0 && account.get('note') !== '<p></p>' && <div className='account__header__content translate' dangerouslySetInnerHTML={content} />}

            <div className='account__header__personal--wrapper'>
              <table className='account__header__personal'>
                <tbody>
                  {location && <tr>
                    <th><Icon id='map-marker' fixedWidth aria-hidden='true' /> <FormattedMessage id='account.location' defaultMessage='Location' /></th>
                    <td>{location}</td>
                  </tr>}
                  {birthday && <tr>
                    <th><Icon id='birthday-cake' fixedWidth aria-hidden='true' /> <FormattedMessage id='account.birthday' defaultMessage='Birthday' /></th>
                    <td><FormattedDate value={birthday} hour12={false} year='numeric' month='short' day='2-digit' />(<FormattedMessage id='account.age' defaultMessage='{age} years old}' values={{ age: age(birthday) }} />)</td>
                  </tr>}
                  <tr>
                    <th><Icon id='calendar' fixedWidth aria-hidden='true' /> <FormattedMessage id='account.joined' defaultMessage='Joined' /></th>
                    <td><FormattedDate value={joined} hour12={false} year='numeric' month='short' day='2-digit' /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

}
