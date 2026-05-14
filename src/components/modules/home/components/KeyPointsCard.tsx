import { JSX } from 'solid-js';

import { useI18n } from '../../../../lang/useI18n';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { Title } from '../../../primitives/Title';

export const KeyPointsCard = (props: { children: JSX.Element; hideHeader?: boolean }) => {
  const i18n = useI18n();

  return (
    <Card>
      <div class="space-y-4">
        {!props.hideHeader && (
          <div class="flex items-center gap-2">
            <div>
              <Icon icon="icon icon-lightbulb-fill" variant="secondary100Icon400" size="default" />
            </div>
            <div>
              <Title variant="h5" tag="p" class="font-medium">
                {i18n().t('components.modules.home.sections.keyPoints')}
              </Title>
            </div>
          </div>
        )}

        {props.children}
      </div>
    </Card>
  );
};
