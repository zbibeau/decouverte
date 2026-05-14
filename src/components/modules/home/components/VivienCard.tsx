import { JSX } from 'solid-js';

export const VivienCard = (props: { children: JSX.Element }) => {
  return (
    <div class="relative flex w-full flex-col-reverse items-center">
      <div class="w-full rounded-3xl bg-white p-6 shadow">{props.children}</div>

      <img src="/illustrations/toolbox-1-2-vivien.webp" class="size-32 md:absolute md:-top-6 md:right-1" alt="vivien" />
    </div>
  );
};
