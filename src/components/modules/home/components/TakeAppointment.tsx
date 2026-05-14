/* eslint-disable solid/no-innerhtml */
import { createForm, setValue, validate, zodForm } from '@modular-forms/solid';
import { createScriptLoader } from '@solid-primitives/script-loader';
import { OASOutput } from 'fets';
import Cookies from 'js-cookie';
import { createEffect, createMemo, createSignal, on, onMount } from 'solid-js';
import { object, string } from 'zod';
import * as z from 'zod';

import { useI18n } from '../../../../lang/useI18n';
import client, { ClientType } from '../../../../services/api/RESTClient';
import { useI18nDict } from '../../../../services/useI18nDict';
import { Button } from '../../../atoms/Button';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { InputForm } from '../../../atoms/Input';
import { Modal } from '../../../atoms/Modal';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';
import { useHome } from '../context/HomeContext';
import { HubspotCookieName, LOCALSTORAGE_EMAIL_KEY } from '../utils/HomeIds';

const HomeNextTransitionFR = {
  loading: 'Veuillez patienter pendant que nous vérifions si vous avez déjà un rendez-vous planifié…',
  loadingNoContact: 'Veuillez patienter pendant que nous nous assurons que tout est en place…',
  nextMeeting: {
    title: 'Prochaine étape : votre rendez-vous',
    nextMeeting: 'Programmé le :',
    date: 'le {{date}} à {{hour}}',
    editOrCancel: 'Pour modifier ou annuler :',
    editOrCancelEmail: 'assistance@madeformed.com',
    thanks: 'Ce sera l’occasion de répondre à vos dernières questions. À très vite !',
  },
  validateInformations: {
    title: 'Validez vos informations',
    email: 'Email',
    action: 'Je valide',
  },
  takeAppointment: {
    title: `Prenez rdv afin d'aborder toutes vos questions`,
  },
  noAppointment: 'Ne pas prendre de RDV',
};
import { HOME_STEPS } from '../utils/HomeSteps';
import { DemoObjectToHubspotObject } from '../utils/HubspotMapping';

const Schema = object({
  email: string().email(),
}).required();
type SchemaType = z.infer<typeof Schema>;

type ContactInformations = OASOutput<ClientType, '/contacts', 'get', '200'>;

export const TakeAppointment = (props: { setHaveRDV: (value: boolean) => void }) => {
  const i18n = useI18n();

  const t = useI18nDict({ fr: HomeNextTransitionFR });

  const { isLoading, setIsLoading, data, setHubspotContactId, setData } = useHome();
  const [displayForm, setDisplayForm] = createSignal<boolean>(false);
  const [contactInformations, setContactInformations] = createSignal<ContactInformations>();
  const [loadingMessage, setLoadingMessage] = createSignal<string>(t()(`loading`));

  const [form, { Form, Field }] = createForm<SchemaType>({
    validate: zodForm(Schema),
    validateOn: 'input',
    revalidateOn: 'input',
    initialValues: {},
  });
  const [email, setEmail] = createSignal<string>();

  const loadContact = async (queryParams: { utk?: string } | { email?: string }) => {
    setIsLoading(true);
    const query = await client['/contacts'].get({
      query: queryParams,
    });

    //Contact not found
    if (query.status === 404) {
      setIsLoading(false);
      throw 'Contact not found';
    }

    const result = await query.json();
    setContactInformations(result);
    if (!result?.meeting?.startDate) {
      setDisplayForm(true);
    } else {
      setDisplayForm(false);
    }
    await saveContactData();
  };

  onMount(() => {
    //If cookies is detected load contact
    if (Cookies.get(HubspotCookieName)) {
      loadContact({ utk: Cookies.get(HubspotCookieName) });
    } else {
      if (localStorage && localStorage.getItem(LOCALSTORAGE_EMAIL_KEY)) {
        setEmail(localStorage.getItem(LOCALSTORAGE_EMAIL_KEY));
        setValue(form, 'email', localStorage.getItem(LOCALSTORAGE_EMAIL_KEY));
      }
    }
  });

  createEffect(() => {
    if (contactInformations()) {
      props.setHaveRDV(!!contactInformations()?.meeting?.startDate);
    }
  });

  createEffect(() => {
    //To force validation on start
    validate(form, { shouldActive: false });
  });

  createEffect(
    on(email, () => {
      if (email()?.length > 0) {
        (async () => {
          try {
            await loadContact({ email: email() });
          } catch (error) {
            setDisplayForm(true);
          }
        })();
      }
    }),
  );

  const onSubmitForm = (data: { email?: string }) => {
    setEmail(data.email);
    if (localStorage) {
      localStorage.setItem(LOCALSTORAGE_EMAIL_KEY, data.email);
    }
  };

  const saveContactData = async (retryUntilItWorks = false, newRdv = false) => {
    setIsLoading(true);

    try {
      let contact: ContactInformations['contact'];

      if (!contactInformations()?.contact?.id) {
        //Search by email if user doesn't exist
        const query = await client['/contacts'].get({
          query: {
            email: email(),
          },
        });

        //Contact not found
        if (query.status === 404) {
          throw 'Contact not found';
        }

        const response = await query.json();

        contact = response?.contact;
      } else {
        contact = contactInformations()?.contact;
      }

      setHubspotContactId(contact?.id);

      if (newRdv) {
        setData({
          origine_adv: 'hors_site',
        });
      }

      const query = await client['/contacts/{contact_id}'].put({
        params: {
          contact_id: contact?.id?.toString(),
        },
        json: {
          // @ts-ignore
          data: DemoObjectToHubspotObject({
            CURRENT_STEP: HOME_STEPS.STEP_NEXT_TRANSITION,
            ...data(),
            ...(newRdv ? { origine_adv: 'hors_site' } : {}),
          }),
        },
        query: {},
      });

      //Contact not found
      if (!query.ok) {
        throw 'Update fail';
      }

      if (retryUntilItWorks) {
        await loadContact({ email: contact?.email });
      }
      setIsLoading(false);
    } catch (error) {
      if (retryUntilItWorks) {
        setTimeout(() => saveContactData(retryUntilItWorks, newRdv), 500);
        return;
      }
      alert(i18n().t('components.modules.home.unexpectedError'));
      setIsLoading(false);
      throw 'Unexpected error';
    }
  };

  return (
    <>
      <div>
        {!contactInformations() && !displayForm() && (
          <>
            <Card>
              <Form onSubmit={(data) => onSubmitForm(data)} class="space-y-4">
                <div class="flex items-center gap-2">
                  <div>
                    <Icon icon="icon icon-lightbulb-fill" variant="secondary100Icon400" size="default" />
                  </div>
                  <div>
                    <Title variant="h5" tag="p" class="font-medium">
                      {t()('validateInformations.title')}
                    </Title>
                  </div>
                </div>

                <div class="mx-auto w-full max-w-[294px]">
                  <Field name="email" type="string">
                    {(field, props) => (
                      <InputForm
                        placeholder={t()('validateInformations.email')}
                        name={props.name}
                        value={field.value}
                        error={field.touched ? field.error : undefined}
                        form={form}
                        variant="secondary"
                      />
                    )}
                  </Field>
                </div>

                <Button variant="primary" class="mx-auto" type="submit" disabled={form.invalid || isLoading()}>
                  {isLoading() ? (
                    <Icon
                      icon="icon icon-loop-right-line animate-spin !bg-white"
                      variant="whitePrimary400"
                      isTransparent
                      size="xs"
                      class="m-auto"
                    />
                  ) : (
                    t()('validateInformations.action')
                  )}
                </Button>
              </Form>
            </Card>
          </>
        )}

        {!!contactInformations() && !!contactInformations()?.meeting?.startDate && (
          <>
            <Card>
              <div class="space-y-4">
                <div class="flex items-center gap-2">
                  <div>
                    <Icon icon="icon icon-lightbulb-fill" variant="secondary100Icon400" size="default" />
                  </div>
                  <div>
                    <Title variant="h5" tag="p" class="font-medium">
                      {t()('nextMeeting.title')}
                    </Title>
                  </div>
                </div>

                <div class="w-full space-y-4 rounded-2xl bg-primary-50 p-4 !pb-4 text-center">
                  <Text variant="sm">{t()('nextMeeting.nextMeeting')}</Text>

                  <Text fontWeight="medium" class="text-primary-400">
                    {t()('nextMeeting.date', {
                      date: i18n().format(new Date(contactInformations()!.meeting!.startDate!), 'PPP'),
                      hour: i18n().format(new Date(contactInformations()!.meeting!.startDate!), 'p'),
                    })}
                  </Text>

                  <div class="w-full space-y-2 rounded-2xl bg-primary-100 p-2 text-center">
                    <Text variant="sm">{t()('nextMeeting.editOrCancel')}</Text>

                    <div>
                      <Text variant="sm">{t()('nextMeeting.editOrCancelEmail')}</Text>
                    </div>
                  </div>
                </div>

                <Text variant="sm" class="text-center">
                  {t()('nextMeeting.thanks')}
                </Text>
              </div>
            </Card>
          </>
        )}

        {displayForm() && (
          <Card class="space-y-4">
            <div class="flex items-center gap-2">
              <div>
                <Icon icon="icon icon-lightbulb-fill" variant="secondary100Icon400" size="default" />
              </div>
              <div>
                <Title variant="h5" tag="p" class="font-medium">
                  {t()('takeAppointment.title')}
                </Title>
              </div>
            </div>

            <HomeTransitionIframe
              onCompleted={(email) => {
                setLoadingMessage(t()('loadingNoContact'));
                onSubmitForm({ email });
                //Time for hubspot
                saveContactData(true, true);
              }}
              data={{
                email: email(),
                firstName: contactInformations()?.contact?.firstName,
                lastName: contactInformations()?.contact?.lastName,
              }}
              ownerId={contactInformations()?.owner?.id}
            />
          </Card>
        )}
      </div>

      {isLoading() && (
        <Modal isOpen>
          <div class="space-y-2">
            <Icon icon="icon icon-loop-right-line animate-spin" variant="secondary100Icon400" class="m-auto" />
            <p class="text-center italic">{loadingMessage()}</p>
          </div>
        </Modal>
      )}
    </>
  );
};

const HomeTransitionIframe = (props: {
  ownerId?: number;
  data: Record<string, any>;
  onCompleted: (email: string) => void;
}) => {
  onMount(() => {
    window.addEventListener('message', function (event) {
      if (event.data.meetingBookSucceeded) {
        props.onCompleted(event.data.meetingsPayload.bookingResponse.postResponse.contact.email);
      }
    });
  });

  const meetingURL = createMemo(() => {
    const defaultMeetingURL = import.meta.env.VITE_HUBSPOT_MEETING_POST_DEMO;

    if (!props.ownerId) {
      return defaultMeetingURL;
    }

    const customURLs = JSON.parse(import.meta.env.VITE_HUBSPOT_MEETINGS_POST_DEMO || '{}');

    return customURLs[props.ownerId.toString()] || defaultMeetingURL;
  });

  const searchParams = createMemo(() => {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(props.data || {})) {
      if (value !== undefined) {
        searchParams.set(key, value);
      }
    }
    //Default hubspot parameter
    searchParams.set('embed', 'true');

    return searchParams.toString();
  });

  createScriptLoader({
    src: 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js',
  });

  return <div class="meetings-iframe-container overflow-auto" data-src={`${meetingURL()}?${searchParams()}`} />;
};
