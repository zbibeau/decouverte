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
                // Handoff §3 : en-têtes de section en petites capitales
                // `primary-500`, letter-spacing .12em. La 1ère section
                // du sommaire écrit ainsi « CONSTAT », « LA BOÎTE À
                // OUTILS DU MÉDECIN », « LA SUITE AVEC NOUS ».
                // Connecteur absolu supprimé : il chevauchait le texte
                // du titre. La maquette `03-sommaire.png` ne montre
                // aucune ligne entre les groupes.
                <p class="px-2 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-primary-500">
                  {group.title}
                </p>
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

            {/* Connecteur inter-groupes supprimé : la maquette
                `03-sommaire.png` ne montre aucune ligne entre les
                groupes. La progression est lue via les états des
                items eux-mêmes (carte blanche done, bandeau primary-100
                active). */}
          </>
        )}
      </For>
    </div>
  );
};
