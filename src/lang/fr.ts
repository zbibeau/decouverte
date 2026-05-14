import { ZodFr } from './zodFr';

export const frI18n = {
  global: {
    seo: {
      title: 'Découverte - MadeForMed',
      description: 'Découvrez comment avec MadeForMed vous pouvez moderniser la médecine de famille !',
    },
  },
  components: {
    modules: {
      home: {
        mobileModal: {
          layout: {
            subTitle: 'Retrouvez l’équilibre',
          },
          step1: {
            description: 'Pour une expérience optimale, privilégiez l’utilisation d’un ordinateur.',
            shareLinkText: 'Découverte de MadeForMed',
            shareLink: 'Partager le lien',
            copyLink: 'Copier le lien',
            continue: 'Poursuivre quand même',
          },
          step2: {
            emailLabel: 'Saisissez votre adresse email.',
            placeholder: 'email@mfm.fr',
            submit: 'Envoyer',
            back: 'Return',
          },
          step3: {
            title: 'Merci !',
            description: 'Vous allez être redirigé vers notre site Internet...',
          },
        },
        unexpectedError: 'Une erreur est survenue ! Veuillez réessayer !',
        sections: {
          keyPoints: 'Les points clés',
          next: 'La suite',
        },
      },
    },
  },
  layout: {
    stepper: {
      back: 'Accueil',
      sections: {
        observation: {
          title: 'Constat',
          step1: 'Le téléphone reste un problème',
        },
        tool: {
          title: 'La boite à outils du médecin',
          step1: 'Un filtre multicanal',
          step2: 'Un agenda métier',
          step3: 'Des outils de communication',
        },
        next: {
          title: 'La suite avec nous',
          step1: 'Nos tarifs',
          step2: 'Pour une transition réussie',
        },
      },
      share: 'Partagez cette découverte',
      shareCopied: 'Lien copié !',
      discover: 'Découvrir',
      takeAppointment: 'Prenez un rendez-vous',
    },
  },
  pages: {
    home: {
      title: 'Home',
    },
  },
  ...ZodFr,
};
