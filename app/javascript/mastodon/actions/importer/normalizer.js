import escapeTextContentForBrowser from "escape-html";
import emojify from "../../features/emoji/emoji";
import { unescapeHTML } from "../../utils/html";
import { expandSpoilers } from "../../initial_state";

const domParser = new DOMParser();

const makeEmojiMap = (record) =>
  record.emojis.reduce((obj, emoji) => {
    obj[`:${emoji.shortcode}:`] = emoji;
    return obj;
  }, {});

export function searchTextFromRawStatus(status) {
  const spoilerText = status.spoiler_text || "";
  const searchContent = [spoilerText, status.content]
    .concat(
      status.poll && status.poll.options
        ? status.poll.options.map((option) => option.title)
        : []
    )
    .concat(status.media_attachments.map((att) => att.description))
    .join("\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/p><p>/g, "\n\n");
  return domParser.parseFromString(searchContent, "text/html").documentElement
    .textContent;
}

export function normalizeAccount(account) {
  account = { ...account };
  const domain = account.acct?.split("@")[1] ?? "";

  const emojiMap = makeEmojiMap(account);
  const displayName =
    account.display_name.trim().length === 0
      ? account.username
      : account.display_name;

  account.display_name_html = emojify(
    escapeTextContentForBrowser(displayName),
    emojiMap,
    domain
  );
  account.note_emojified = emojify(account.note, emojiMap, domain);
  account.note_plain = unescapeHTML(account.note);
  account.followed_message_emojified = emojify(
    account.followed_message,
    emojiMap,
    domain
  );

  if (account.fields) {
    account.fields = account.fields.map((pair) => ({
      ...pair,
      name_emojified: emojify(
        escapeTextContentForBrowser(pair.name),
        emojiMap,
        domain
      ),
      value_emojified: emojify(pair.value, emojiMap, domain),
      value_plain: unescapeHTML(pair.value),
    }));
  }

  if (account.moved) {
    account.moved = account.moved.id;
  }

  if (
    !(account.url.startsWith("http://") || account.url.startsWith("https://"))
  ) {
    account.url = account.uri;
  }

  return account;
}

export function normalizeStatus(status, normalOldStatus, domain) {
  const normalStatus = { ...status };

  if (typeof status.account === "object") {
    normalStatus.account = status.account.id;
  }

  if (status.reblog && status.reblog.id) {
    normalStatus.reblog = status.reblog.id;
  }

  if (status.poll && status.poll.id) {
    normalStatus.poll = status.poll.id;
  }

  // Only calculate these values when status first encountered and
  // when the underlying values change. Otherwise keep the ones
  // already in the reducer
  if (
    normalOldStatus &&
    normalOldStatus.get("content") === normalStatus.content &&
    normalOldStatus.get("spoiler_text") === normalStatus.spoiler_text
  ) {
    normalStatus.search_index = normalOldStatus.get("search_index");
    normalStatus.shortHtml = normalOldStatus.get("shortHtml");
    normalStatus.contentHtml = normalOldStatus.get("contentHtml");
    normalStatus.spoilerHtml = normalOldStatus.get("spoilerHtml");
    normalStatus.spoiler_text = normalOldStatus.get("spoiler_text");
    normalStatus.hidden = normalOldStatus.get("hidden");
    normalStatus.visibility = normalOldStatus.get("visibility");
    normalStatus.media_attachments = normalOldStatus.get("media_attachments");
  } else {
    // If the status has a CW but no contents, treat the CW as if it were the
    // status' contents, to avoid having a CW toggle with seemingly no effect.
    if (normalStatus.spoiler_text && !normalStatus.content) {
      normalStatus.content = normalStatus.spoiler_text;
      normalStatus.spoiler_text = "";
    }

    const spoilerText = normalStatus.spoiler_text || "";
    const searchContent = [spoilerText, status.content]
      .concat(
        status.poll && status.poll.options
          ? status.poll.options.map((option) => option.title)
          : []
      )
      .join("\n\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<\/p><p>/g, "\n\n");
    const emojiMap = makeEmojiMap(normalStatus);

    const docContentElem = domParser.parseFromString(
      searchContent,
      "text/html"
    ).documentElement;
    docContentElem.querySelector(".quote-inline")?.remove();
    docContentElem.querySelector(".reference-link-inline")?.remove();
    docContentElem.querySelector(".original-media-link")?.remove();

    const flagment = domParser.parseFromString(
      emojify(normalStatus.content, emojiMap, domain),
      "text/html"
    ).documentElement;

    flagment.querySelectorAll("body>p").forEach((p) => {
      let imgCount = 0;
      let scale = true;
      let mix = true;

      function emojiScaleCheck(nodes) {
        for (let i = 0; i < nodes.length; i++) {
          let node = nodes[i];

          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.tagName === "IMG" &&
            node.classList.contains("emojione")
          ) {
            imgCount++;
          } else if (
            node.nodeType === Node.TEXT_NODE &&
            /[^ \t\u200B\u200C\u3000]/.test(node.textContent)
          ) {
            scale = false;
            mix = false;
          } else if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.tagName === "A"
          ) {
            scale = false;
          } else if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.tagName === "SPAN"
          ) {
            emojiScaleCheck(node.childNodes);
          }
        }
      }

      emojiScaleCheck(p.childNodes);

      if (scale && imgCount === 1) {
        p.classList.add("emoji-single");
      } else if (scale && imgCount > 1) {
        p.classList.add("emoji-multi");
      } else if (mix && imgCount > 0) {
        p.classList.add("emoji-mix");
      } else if (imgCount > 0) {
        p.classList.add("emoji-other");
      }
    });

    normalStatus.search_index = docContentElem.textContent;
    normalStatus.shortHtml =
      "<p>" +
      emojify(normalStatus.search_index.substr(0, 150), emojiMap, domain) +
      (normalStatus.search_index.substr(150) ? "..." : "") +
      "</p>";
    normalStatus.contentHtml = flagment.innerHTML;
    normalStatus.spoilerHtml = emojify(
      escapeTextContentForBrowser(spoilerText),
      emojiMap,
      domain
    );
    normalStatus.hidden = expandSpoilers
      ? false
      : spoilerText.length > 0 || normalStatus.sensitive;
    normalStatus.visibility = normalStatus.visibility_ex
      ? normalStatus.visibility_ex
      : normalStatus.visibility;
    normalStatus.quote = null;
    normalStatus.media_attachments = status.media_attachments?.map(
      (media, i) => ({ ...media, order: i })
    );

    if (
      normalStatus.url &&
      !(
        normalStatus.url.startsWith("http://") ||
        normalStatus.url.startsWith("https://")
      )
    ) {
      normalStatus.url = null;
    }

    normalStatus.url = normalStatus.url || normalStatus.uri;

    normalStatus.media_attachments.forEach((item) => {
      if (
        item.remote_url &&
        !(
          item.remote_url.startsWith("http://") ||
          item.remote_url.startsWith("https://")
        )
      )
        item.remote_url = null;
    });
  }

  return normalStatus;
}

export function normalizePoll(poll) {
  const normalPoll = { ...poll };
  const emojiMap = makeEmojiMap(normalPoll);

  normalPoll.options = poll.options.map((option, index) => ({
    ...option,
    voted: poll.own_votes && poll.own_votes.includes(index),
    title_emojified: emojify(
      escapeTextContentForBrowser(option.title),
      emojiMap
    ),
  }));

  return normalPoll;
}

export function normalizeAnnouncement(announcement) {
  const normalAnnouncement = { ...announcement };
  const emojiMap = makeEmojiMap(normalAnnouncement);

  normalAnnouncement.contentHtml = emojify(
    normalAnnouncement.content,
    emojiMap
  );

  return normalAnnouncement;
}

export function normalizeCustomEmojiDetail(emoji) {
  const normalEmoji = { ...emoji };

  if (typeof emoji.creator === "object") {
    normalEmoji.creator = creator.creator.id;
  }

  normalEmoji.shortcode_with_domain = `${emoji.shortcode}${
    emoji.local ? "" : `@${emoji.domain}`
  }`;
  normalEmoji.aliases = emoji.aliases?.map((alias) =>
    alias ? escapeTextContentForBrowser(alias) : null
  );
  normalEmoji.category = emoji.category
    ? escapeTextContentForBrowser(emoji.category)
    : null;
  normalEmoji.org_category = emoji.org_category
    ? escapeTextContentForBrowser(emoji.org_category)
    : null;

  return normalEmoji;
}
