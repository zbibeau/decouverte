import { writeClipboard } from '@solid-primitives/clipboard';
import { createWindowSize } from '@solid-primitives/resize-observer';
import { createScrollPosition } from '@solid-primitives/scroll';
import { makeWebShare } from '@solid-primitives/share';
import cx from 'classix';
import { Accessor, Component, createEffect, createMemo, createSignal, JSX, on } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Transition } from 'solid-transition-group';

import { useI18n } from '../../lang/useI18n';
import { BrandLogo } from '../atoms/BrandLogo';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Modal } from '../atoms/Modal';
import { GotToNextPartButton } from '../modules/home/components/GoToNextPartButton';
import { TakeAppointment } from '../modules/home/components/TakeAppointment';
import { DEFAULT_PARCOURS_SLUG, useHome } from '../modules/home/context/HomeContext';
import { stepperContentId } from '../modules/home/utils/HomeIds';
import { HOME_STEPS, HOME_STEPS_KEYS } from '../modules/home/utils/HomeSteps';
import { buildDynamicSections, HOME_SECTIONS_DATA, HOME_STEPS_LAYOUT_VALUE } from '../modules/home/utils/HomeUtils';
import { NavItem, NavItemStatus } from '../molecules/NavItem';
import { NavGroup } from '../organisms/NavGroup';
const MAX_MOBILE_WIDTH = 1200;

export const isLayoutMobileDisplay = () => {
  const windowSize = createWindowSize();

  const isMobileDisplay = createMemo(() => windowSize.width <= MAX_MOBILE_WIDTH);

  return isMobileDisplay;
};

const TakeAppointmentButton = () => {
  const i18n = useI18n();
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [haveRDV, setHaveRDV] = createSignal<boolean>(false);

  return (
    <>
      <Modal isOpen={isModalOpen()} onChange={() => setIsModalOpen(false)}>
        <TakeAppointment setHaveRDV={setHaveRDV} />
      </Modal>
      <Button
        variant="whitePrimary"
        class="w-full"
        size="sm"
        prefixIcon="icon icon-calendar-todo-fill"
        onClick={() => setIsModalOpen(true)}
      >
        {i18n().t('layout.stepper.takeAppointment')}
      </Button>
    </>
  );
};

const ShareButton = () => {
  const i18n = useI18n();

  const share = makeWebShare();
  const [isLinkCopied, setIsLinkCopied] = createSignal<boolean>(false);

  const onShare = async () => {
    const link = window.location.href;

    try {
      await share({
        url: link,
        title: i18n().t('components.modules.home.mobileModal.step1.shareLinkText'),
      });
    } catch (error) {
      writeClipboard(link);

      setIsLinkCopied(true);
      setTimeout(() => {
        setIsLinkCopied(false);
      }, 3000);
    }
  };

  return (
    <Button
      variant="whitePrimary"
      class="w-full"
      size="sm"
      prefixIcon="icon icon-send-plane-fill"
      onClick={() => onShare()}
    >
      {isLinkCopied() ? i18n().t('layout.stepper.shareCopied') : i18n().t('layout.stepper.share')}
    </Button>
  );
};

let ref: HTMLDivElement | undefined;
export const StepperLayout: Component<{
  children: JSX.Element;

  currentStep: Accessor<HOME_STEPS_KEYS>;
  setCurrentStep: (step: HOME_STEPS_KEYS) => void;

  mostAdvancedStep: Accessor<HOME_STEPS_KEYS>;
}> = (props) => {
  const i18n = useI18n();
  const { parcoursSlug, chapters } = useHome();

  const isMobileDisplay = isLayoutMobileDisplay();
  const [isMobileMenuDisplay, setIsMobileMenuDisplay] = createSignal(false);
  const windowScroll = createScrollPosition(() => ref);

  /**
   * Decide which stepper data to feed the sidebar :
   *   - For the legacy `demo-ventes` parcours, keep the hardcoded
   *     HOME_SECTIONS_DATA + HOME_STEPS_LAYOUT_VALUE mapping (no schema
   *     migration needed for the live demo).
   *   - For any other parcours, build sections dynamically from the
   *     `chapter.section_label` column loaded into `chapters()`.
   * The transition is automatic and per-parcours — no code change needed
   * when a new parcours is created.
   */
  const useDynamic = createMemo(() => parcoursSlug() !== DEFAULT_PARCOURS_SLUG);
  const dynamic = createMemo(() =>
    buildDynamicSections(chapters(), props.currentStep() as string, (slug) =>
      props.setCurrentStep(slug as HOME_STEPS_KEYS),
    ),
  );

  createEffect(
    on(isMobileDisplay, () => {
      setIsMobileMenuDisplay(false);
    }),
  );

  createEffect(() => {
    if (props.currentStep()) {
      setIsMobileMenuDisplay(false);
    }
  });

  const percentageContent = createMemo(() => {
    let elementHeight = window.innerHeight;
    let scrollY = windowScroll.y;
    try {
      elementHeight = document.getElementById(stepperContentId).scrollHeight;
      // eslint-disable-next-line no-empty
    } catch (error) {}

    //Remove first section
    if (scrollY <= window.innerHeight) {
      scrollY = 0;
    } else {
      scrollY -= window.innerHeight;
      //Remove first section + Last
      elementHeight -= window.innerHeight * 2;
    }

    return Math.ceil((scrollY * 100) / elementHeight);
  });

  return (
    <div
      class={cx('flex h-dvh w-dvw bg-cover bg-center bg-no-repeat', isMobileDisplay() && 'flex-col')}
      style={{
        'background-image': 'url(/background/bg-hero-content.webp)',
        'box-shadow': 'inset 0 0 0 100dvh rgba(255, 248, 238, 0.5)',
      }}
    >
      {!isMobileDisplay() ? (
        // Sidebar 296px sur fond blanc avec border-right hairline —
        // refonte handoff §3. Le shadow-sidebar legacy (ombre douce
        // ambient) est remplacé par un border-right propre + le
        // shadow-card du wrapper global donne déjà le détourage.
        <aside class="flex h-full w-[296px] shrink-0 flex-col justify-between space-y-5 border-r border-violet-border-soft bg-white p-6">
          {/* Easter egg : double-clicking the brand logo plays a 700ms
              spring wiggle. Pure delight. Won't fire if a screen reader
              user is just navigating (single click does nothing), and
              the global prefers-reduced-motion rule shortens the
              animation to 0.01ms for vestibular-sensitive visitors. */}
          <button
            type="button"
            class="mx-auto cursor-default border-0 bg-transparent p-0 [&.mfm-easter-egg]:animate-[mfm-logo-wiggle_700ms_cubic-bezier(0.34,1.56,0.64,1)]"
            onDblClick={(e) => {
              const el = e.currentTarget;
              el.classList.remove('mfm-easter-egg');
              // Force reflow so the class re-add restarts the animation.
              void el.offsetWidth;
              el.classList.add('mfm-easter-egg');
            }}
            aria-label="Logo"
          >
            <BrandLogo variant="secondary900" size="1.5x" />
          </button>

          <div class="h-full space-y-3 overflow-auto">
            <NavItem
              text={i18n().t('layout.stepper.back')!}
              status={NavItemStatus.back}
              onClick={() => props.setCurrentStep(HOME_STEPS.INTRO)}
            />

            <NavGroup
              data={useDynamic() ? dynamic().data : HOME_SECTIONS_DATA(i18n().t, props.setCurrentStep)}
              actualStep={useDynamic() ? dynamic().actualStep : HOME_STEPS_LAYOUT_VALUE[props.currentStep()]}
              disableFromStep={
                useDynamic()
                  ? undefined
                  : props.mostAdvancedStep()
                    ? HOME_STEPS_LAYOUT_VALUE[props.mostAdvancedStep()]
                    : undefined
              }
            />
          </div>

          <div class="space-y-2">
            {/* Mini-indicateur de progression dans le footer sidebar —
                handoff §3. Aligné avec la barre de progression du haut
                (même % de scroll). Visuel modeste : label uppercase +
                track plate + remplissage gradient violet. */}
            <div class="space-y-1.5">
              <div class="flex items-baseline justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-primary-500">
                <span>Progression</span>
                <span class="font-mono">{percentageContent()}%</span>
              </div>
              <div class="h-1 w-full overflow-hidden rounded-full bg-violet-divider">
                <div
                  class="h-full bg-progress-violet transition-[width]"
                  style={{ width: `${percentageContent()}%` }}
                />
              </div>
            </div>
            <TakeAppointmentButton />
            <ShareButton />
          </div>
        </aside>
      ) : (
        <div>
          <div class="flex items-center p-3 shadow-sidebar shadow-shadow-sidebar">
            <div class="flex w-full items-center justify-between">
              <div>
                <BrandLogo variant="secondary900" size="1.5x" />
              </div>

              <div class="hover:opacity-80" onClick={() => setIsMobileMenuDisplay((v) => !v)}>
                <Icon
                  variant="secondary100Icon400"
                  icon={isMobileMenuDisplay() ? 'icon icon-close' : 'icon icon-menu-line'}
                />
              </div>
            </div>
          </div>

          {/* `mobile-menu-*` keyframes (see scss/index.scss) deliver a soft
              spring slide-down + fade-in on open, mirroring iOS-style
              sheet animations. Without this the menu used to pop in
              abruptly — jarring on a tactile surface. The transition is
              automatically neutered under prefers-reduced-motion.

              Refonte handoff §3 — sheet mobile plein écran avec header
              « Sommaire » + pill « Étape N / N » en haut. Le contenu
              (NavGroup) garde son rendu refondu via NavItem v2. */}
          <Transition name="mobile-menu">
            {isMobileMenuDisplay() && (
              <Portal>
                <div class="absolute left-0 top-[56px] z-[999] flex h-[calc(100dvh-56px)] w-dvw flex-col justify-between space-y-5 overflow-auto bg-white p-6">
                  <div class="h-full space-y-3 overflow-auto">
                    {/* Header sheet — h2 « Sommaire » + pill « Étape X / N »
                        de l'étape courante. L'index plat est calculé à
                        partir du `actualStep` "X.Y" et de la data des
                        groupes (somme des steps avant + index dans le
                        groupe courant). Affiche « — / N » si non résolu. */}
                    <div class="flex items-baseline justify-between pb-2">
                      <h2 class="text-2xl font-black tracking-[-0.02em] text-primary-950">Sommaire</h2>
                      <span class="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-600">
                        {(() => {
                          const d = useDynamic() ? dynamic().data : HOME_SECTIONS_DATA(i18n().t, props.setCurrentStep);
                          const total = d.reduce((sum, g) => sum + g.steps.length, 0);
                          const cur = useDynamic()
                            ? dynamic().actualStep
                            : HOME_STEPS_LAYOUT_VALUE[props.currentStep()];
                          if (!cur) return `— / ${total}`;
                          const [g, s] = cur.split('.').map((v) => parseInt(v));
                          const prior = d.slice(0, g - 1).reduce((sum, grp) => sum + grp.steps.length, 0);
                          return `Étape ${prior + s} / ${total}`;
                        })()}
                      </span>
                    </div>
                    <NavItem
                      text={i18n().t('layout.stepper.back')!}
                      status={NavItemStatus.back}
                      onClick={() => props.setCurrentStep(HOME_STEPS.INTRO)}
                    />

                    <NavGroup
                      data={useDynamic() ? dynamic().data : HOME_SECTIONS_DATA(i18n().t, props.setCurrentStep)}
                      actualStep={useDynamic() ? dynamic().actualStep : HOME_STEPS_LAYOUT_VALUE[props.currentStep()]}
                      disableFromStep={
                        useDynamic()
                          ? undefined
                          : props.mostAdvancedStep()
                            ? HOME_STEPS_LAYOUT_VALUE[props.mostAdvancedStep()]
                            : undefined
                      }
                    />
                  </div>

                  <div class="space-y-2">
                    <TakeAppointmentButton />
                    <ShareButton />
                  </div>
                </div>
              </Portal>
            )}
          </Transition>
        </div>
      )}

      <div
        // `snap-proximity` (instead of `snap-mandatory`) lets the user
        // scroll freely past the last snap target (e.g. when the chapter
        // ends and there's no auto-injected transition grid). Each block
        // still gets `snap-always` (scroll-snap-stop: always), which
        // forces the scroller to stop at every snap point it crosses —
        // so the "form skipped on fast scroll" issue stays fixed.
        class="relative grow snap-y snap-proximity overflow-auto bg-opacity-50"
        id={stepperContentId}
        ref={(e) => (ref = e)}
      >
        {/* Reading progress bar. When the parcours has a `theme_color`
            set (migration 0035, injected as `--mfm-theme` by HomeProvider),
            we tint the bar with that pastel so each parcours has its
            own visual identity end-to-end. Sans theme color, fallback
            sur le `bg-progress-violet` (refonte handoff §Token —
            linéaire 90deg #9951FB → #822EEF). `left` aligné sur la
            nouvelle largeur de sidebar 296px (était 280px).

            Sa hauteur passe de 8px à 4px pour un visuel plus moderne
            « thin progress bar », conforme aux maquettes mobile et
            desktop. */}
        <div
          class="fixed top-0 z-[999] h-[4px] rounded-r-md"
          style={{
            width: `${percentageContent()}%`,
            left: isMobileDisplay() ? '0px' : '296px',
            background:
              'linear-gradient(90deg, var(--mfm-theme, transparent) 0%, transparent 200%), linear-gradient(90deg, #9951FB 0%, #822EEF 100%)',
          }}
        />
        <Transition
          name="slide-fade"
          // `mode="outin"` guarantees the previous chapter fully fades out
          // BEFORE the next one fades in — eliminates the brief overlap
          // where the old chapter's hero image lingered ("résiduel") on top
          // of the new chapter's transition cards. Default cross-fade
          // mounted both at once and let them stack vertically during the
          // 0.3s overlap, which the user perceived as a stale photo
          // stuck to the new chapter's top.
          mode="outin"
          onExit={(el, done) => {
            if (document.getElementById(stepperContentId)) {
              document.getElementById(stepperContentId)?.scroll({ top: 0 });
            }
            done();
          }}
        >
          {props.children}
        </Transition>
        <GotToNextPartButton />
      </div>
    </div>
  );
};
