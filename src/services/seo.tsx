import { Meta, Title } from '@solidjs/meta';

export const MetaTagsTitle = (props: { value: string }) => (
  <>
    <Title>{props.value}</Title>
    <Meta name="title" content={props.value} />
    <Meta property="og:title" content={props.value} />
    <Meta property="twitter:title" content={props.value} />
  </>
);

export const MetaTagsDescription = (props: { value: string }) => (
  <>
    <Meta name="description" content={props.value} />
    <Meta property="og:description" content={props.value} />
    <Meta property="twitter:description" content={props.value} />
  </>
);

export const MetaTagsImage = (props: { url: string }) => (
  <>
    <Meta property="og:image" content={props.url} />
    <Meta property="twitter:image" content={props.url} />
  </>
);
