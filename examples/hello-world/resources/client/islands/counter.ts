import { registerIsland } from '@pondoknusa/ssr';

registerIsland('counter', ({ element, props }) => {
  const button = element.querySelector('button');
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  let count = Number(props.count ?? 0);
  button.textContent = String(count);

  const onClick = () => {
    count += 1;
    button.textContent = String(count);
  };

  button.addEventListener('click', onClick);
  return () => button.removeEventListener('click', onClick);
});