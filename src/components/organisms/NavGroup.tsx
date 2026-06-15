import cx from 'classix';
import { createMemo, For, JSX, mergeProps } from 'solid-js';

import { NavItem, NavItemStatus } from '../molecules/NavItem';
import { SubNavItem, SubNavItemStatus } from '../molecules/SubNavItem';
import { Title } from '../primitives/Title';

export type NavGroupData = {
  title?: string;

  steps: {
    text: string;
    status?: NavItemStatus;

    onClick?: JSX.EventHandler<unknown, MouseEvent>;

    subSteps?: {
      text: string;
      status?: SubNavItemStatus;

      onClick?: JSX.EventHandler<unknown, MouseEvent>;
    }[];
  }[];
}[];

/**
 * Step Format : 1.2.3 (1 => GROUP, 2 => STEP, 3 => SUBSTEP)
 */
export const NavGroup = (_props: { data: NavGroupData; actualStep?: string; disableFromStep?: string }) => {
  const props = mergeProps({}, _props);

  const data = createMemo(() => {
    if (props.actualStep !== undefined) {
      let updatedData: NavGroupData = [...props.data] || [];

      const [currentGroup, currentStep, currentSubStep] = props.actualStep.split('.').map((v) => parseInt(v));
      let [disabledGroup, disabledStep, disabledSubStep] = [undefined, undefined, undefined];

      if (props.disableFromStep) {
        const disabledGrp = props.disableFromStep.split('.').map((v) => parseInt(v));

        disabledGroup = disabledGrp[0];
        disabledStep = disabledGrp[1];
        disabledSubStep = disabledGrp[2];
      }

      updatedData = updatedData.map((grp, indexGroup) => {
        const group = { ...grp };

        group.steps = group.steps.map((stp, index) => {
          const step = { ...stp };

          if (indexGroup + 1 === currentGroup && index + 1 === currentStep) {
            step.status = NavItemStatus.active;

            if (step.subSteps?.length) {
              step.subSteps = step.subSteps.map((sstp, index) => {
                const subStep = { ...sstp };

                if (index + 1 === currentSubStep) {
                  subStep.status = SubNavItemStatus.active;
                } else if (disabledSubStep !== undefined && index + 1 >= disabledSubStep) {
                  subStep.status = SubNavItemStatus.disabled;
                } else {
                  subStep.status = SubNavItemStatus.default;
                }
                return subStep;
              });
            }
          } else if (indexGroup + 1 === currentGroup ? index < currentStep : indexGroup + 1 <= currentGroup) {
            step.status = NavItemStatus.done;
          } else if (
            disabledGroup !== undefined &&
            (indexGroup + 1 >= disabledGroup
              ? indexGroup + 1 > disabledGroup
                ? true
                : index + 1 >= disabledStep
              : false)
          ) {
            step.status = NavItemStatus.disabled;
          } else {
            step.status = NavItemStatus.default;
          }

          return step;
        });

        return group;
      });

      return updatedData;
    }

    return props.data;
  });

  return (
    <div>
      <For each={data() || []}>
        {(group, indexGroup) => (
          <>
            <div>
              {group.title && (
                <div class="relative">
                  {/* Handoff §3 : en-têtes de section en petites capitales
                      `primary-500`, letter-spacing .12em. La 1ère section
                      du sommaire écrit ainsi « CONSTAT », « LA BOÎTE À
                      OUTILS DU MÉDECIN », « LA SUITE AVEC NOUS ». */}
                  <p class="px-2 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-primary-500">
                    {group.title}
                  </p>

                  <div class="absolute top-0">
                    {[NavItemStatus.active, NavItemStatus.done].includes(
                      //@ts-ignore
                      data()[indexGroup() - 1]?.steps[data()[indexGroup() - 1]?.steps?.length - 1].status,
                    ) &&
                      [NavItemStatus.active, NavItemStatus.done].includes(group.steps[0].status!) && (
                        <div
                          class={cx(
                            'ml-[0.625rem] block h-6 w-[2px]',
                            // Section line tinted en primary-600 (était
                            // success-400 / vert) pour cohérence palette.
                            'bg-primary-600',
                          )}
                        />
                      )}
                  </div>
                </div>
              )}

              <For each={group.steps || []}>
                {(step, index) => (
                  <>
                    <NavItem
                      status={step.status}
                      text={step.text}
                      onClick={step.onClick}
                      previousIsDone={
                        group.steps?.[index() - 1]?.status === NavItemStatus.done ||
                        [NavItemStatus.active, NavItemStatus.done].includes(
                          //@ts-ignore
                          data()[indexGroup() - 1]?.steps[data()[indexGroup() - 1]?.steps?.length - 1].status,
                        )
                      }
                      isBold={
                        step.status === NavItemStatus.active &&
                        !(step.subSteps || []).find((v) => v.status === SubNavItemStatus.active)
                      }
                      nextIsDone={
                        [NavItemStatus.active, NavItemStatus.done].includes(
                          //@ts-ignore
                          group.steps?.[index() + 1]?.status,
                        ) ||
                        [NavItemStatus.active, NavItemStatus.done].includes(
                          //@ts-ignore
                          data()[indexGroup() + 1]?.steps[0].status,
                        )
                      }
                    />

                    {step.status === NavItemStatus.active &&
                      step.subSteps?.find((s) => s.status === SubNavItemStatus.active) && (
                        <div class="space-y-2">
                          <For each={step?.subSteps || []}>
                            {(subStep) => (
                              <SubNavItem status={subStep.status} text={subStep.text} onClick={subStep.onClick} />
                            )}
                          </For>
                        </div>
                      )}
                  </>
                )}
              </For>
            </div>

            {indexGroup() < data().length - 1 && (
              <div
                class={cx(
                  'ml-[0.625rem] block h-6 w-[2px]',
                  // Inter-group line — primary-600 quand le groupe suivant
                  // a au moins une étape active/done (refonte handoff §3).
                  data()[indexGroup() + 1].steps.find(
                    (s) => s.status !== NavItemStatus.default && s.status !== NavItemStatus.disabled,
                  ) && 'bg-primary-600',
                )}
              />
            )}
          </>
        )}
      </For>
    </div>
  );
};
