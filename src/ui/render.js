/**
 * Turns an answer's blocks into DOM nodes.
 *
 * createElement and textContent throughout. Nothing here builds a string and
 * assigns it to innerHTML, so no answer can carry markup into the page.
 */

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function renderBlock(block) {
  switch (block.type) {
    case 'heading':
      return el('h2', 'answer-heading', block.text);

    case 'paragraph':
      return el('p', 'answer-text', block.text);

    case 'list': {
      const list = el('ul', 'answer-list');
      for (const item of block.items) list.append(el('li', null, item));
      return list;
    }

    case 'facts': {
      const wrapper = document.createElement('div');
      if (block.title) wrapper.append(el('h3', 'answer-subheading', block.title));

      const dl = el('dl', 'answer-facts');
      for (const { label, value } of block.items) {
        dl.append(el('dt', null, label), el('dd', null, value));
      }
      wrapper.append(dl);
      return wrapper;
    }

    case 'link': {
      const link = el('a', 'answer-link', block.text);
      link.href = block.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      return link;
    }

    default:
      return el('p', 'answer-text', block.text ?? '');
  }
}

/** A chat bubble. `who` is "user" or "bot". */
export function renderMessage(who, answer) {
  const message = el('div', `msg msg--${who}`);
  message.setAttribute('role', 'listitem');

  if (typeof answer === 'string') {
    message.append(el('p', 'answer-text', answer));
    return message;
  }

  if (answer.blocks?.length) {
    for (const block of answer.blocks) message.append(renderBlock(block));
  } else {
    message.append(el('p', 'answer-text', answer.text));
  }

  return message;
}

/** Plain text for the speech synthesiser and for the live region. */
export function speakableText(answer) {
  if (typeof answer === 'string') return answer;
  if (!answer.blocks?.length) return answer.text;

  const parts = [];
  for (const block of answer.blocks) {
    if (block.type === 'list') parts.push(block.items.join('. '));
    else if (block.type === 'facts') parts.push(block.items.map((f) => `${f.label}: ${f.value}`).join('. '));
    else if (block.text) parts.push(block.text);
  }
  return parts.join('. ');
}
