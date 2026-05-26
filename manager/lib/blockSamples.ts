import type { ContentBlock } from '@shared/content-schema';

/**
 * Curated samples used by the visual library (`/parcours/[slug]/library`).
 * Each entry pairs a representative payload with a short description and a
 * "when to use" hint so authors can scan the catalogue and pick a block
 * type by recognition rather than memory.
 *
 * Payloads are inspired by the production seeds (0003/0005/0009/0010) but
 * intentionally generic and self-contained (no Vimeo IDs that depend on
 * private uploads, no parcours-specific variable references).
 */
export interface BlockSample {
  description: string;
  whenToUse: string;
  /** Live-render payload used to demo the block on the library page. */
  payload: Record<string, unknown>;
}

export const SAMPLE_PAYLOADS: Record<ContentBlock['type'], BlockSample> = {
  heroTitle: {
    description: "Bandeau de titre en haut d'un chapitre, avec numéro et illustration optionnelle.",
    whenToUse: "Ouverture d'un nouveau chapitre.",
    payload: {
      title: 'Filtrez toutes les demandes',
      number: 1,
      illustration: '/illustrations/toolbox1-header.webp',
    },
  },

  video: {
    description: 'Lecteur Vimeo plein-écran, avec navbar optionnelle (appointment / contact).',
    whenToUse: "Vidéo explicative au début ou au milieu d'un chapitre.",
    payload: {
      vimeoSrc: 'vimeo/907882115?hash=2d4027711d',
      navbar: { variant: 'appointment' },
    },
  },

  text: {
    description: 'Paragraphe libre, HTML autorisé (gras, italique, liens, sauts de ligne).',
    whenToUse: 'Texte de transition entre deux sections.',
    payload: {
      html: "Vous appelez avec le <strong>Click-to-Call</strong>, d'un simple clic en étant assuré de ne jamais dévoiler votre numéro personnel. Votre patient est informé que c'est son médecin qui l'appelle.",
      variant: 'default',
    },
  },

  keyPointsCard: {
    description: 'Carte blanche avec icône + titre + paragraphe + checklist (+ bloc exception en option).',
    whenToUse: "Lister les points-clés d'une fonctionnalité, ou expliquer un usage avec des items à puces.",
    payload: {
      main: {
        icon: 'team-fill',
        title: 'Définissez vos règles générales',
        description:
          'Réglez en toute autonomie vos horaires et vos actes :<br/><i>durée, noms et consignes, ouverture aux nouveaux patients (ou non), etc.</i>',
      },
      exception: {
        icon: 'user-fill',
        title: 'Faites des exceptions pour certains patients',
        items: [
          { text: 'pour un patient polypathologique, ouvrez-lui un acte de 30 min' },
          { text: "en cas d'abus, retirez l'accès à la consultation d'urgence" },
          { text: 'pour un patient indésirable, bloquez-lui la prise de rdv' },
        ],
      },
    },
  },

  faqCard: {
    description:
      'Accordéon de questions/réponses pliables. Chaque question peut contenir du texte, listes, audio, callouts.',
    whenToUse: 'Anticiper les questions fréquentes en fin de section.',
    payload: {
      questions: [
        {
          title: 'Comment Alice identifie le patient ?',
          blocks: [
            {
              kind: 'list',
              items: [
                {
                  text: 'si le patient a déjà une fiche avec un numéro renseigné, il sera reconnu automatiquement',
                },
              ],
            },
            {
              kind: 'callout',
              html: 'un import de votre base patient est possible (gratuit)',
            },
          ],
        },
        {
          title: 'Et pour les patients qui appellent depuis un fixe ?',
          blocks: [{ kind: 'text', html: 'Ils pourront aussi prendre RDV avec Alice.' }],
        },
      ],
    },
  },

  card: {
    description: "Boîte qui contient d'autres blocs (text / key points / conditional…), pour grouper visuellement.",
    whenToUse: 'Regrouper plusieurs blocs liés sous une même carte blanche.',
    payload: {
      children: [
        {
          type: 'keyPointsCard',
          payload: {
            main: {
              icon: 'team-fill',
              title: 'Pendant vos heures de présence',
              items: [
                { text: 'prise de message avec retranscription dans votre interface' },
                { text: "transfert d'appel en cas d'urgence ressentie" },
              ],
            },
          },
        },
      ],
    },
  },

  form: {
    description: 'Formulaire qui collecte des variables (boolean / enum / texte) pour brancher le parcours.',
    whenToUse: "Au début d'un chapitre pour qualifier l'utilisateur (médecin ? cabinet de groupe ?).",
    payload: {
      title: 'Pour une démo personnalisée',
      description: 'Merci de répondre à ces quelques questions :',
      icon: 'icon-check-line',
      nextButtonText: 'Continuer',
      fields: [
        { key: 'isDoctor', label: 'Êtes-vous médecin ?', type: 'boolean', required: true },
        { key: 'isInGroup', label: 'Exercez-vous en groupe ?', type: 'boolean', required: true },
      ],
    },
  },

  conditional: {
    description: "Affiche un sous-bloc selon la valeur d'une variable du parcours (then / else).",
    whenToUse: "Brancher l'expérience selon une réponse précédente (ex. médecin seul vs en groupe).",
    payload: {
      condition: { variable: 'isInGroup', op: '=', value: true },
      then: [
        {
          type: 'text',
          payload: { html: 'Affichage si <strong>isInGroup = true</strong>.', variant: 'default' },
        },
      ],
      else: [
        {
          type: 'text',
          payload: { html: 'Affichage si <strong>isInGroup = false</strong>.', variant: 'default' },
        },
      ],
    },
  },

  componentRef: {
    description: 'Référence à un composant Solid custom (codé en dur dans le client). Permet des layouts spécifiques.',
    whenToUse: 'Quand aucun type de bloc ne convient — un dev doit avoir enregistré le composant au préalable.',
    payload: {
      name: 'HomeTool1_Summary',
    },
  },

  photoCarousel: {
    description:
      'Carrousel de photos plein-largeur, immersif. Flèches gauche/droite, légende en overlay, barre de progression.',
    whenToUse:
      "Présenter visuellement un lieu, des étapes, des avant/après, une galerie de réalisations. Une seule photo visible à la fois, l'utilisateur fait défiler.",
    payload: {
      aspectRatio: '16/9',
      autoplayMs: 0,
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=1600',
          title: "La salle d'attente refaite en 2024",
          description:
            'Travaux réalisés en mars 2024.\nMobilier en chêne massif, éclairage LED tamisé, plantes vertes.',
          alt: "Salle d'attente claire et moderne avec fauteuils en bois",
        },
        {
          url: 'https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?w=1600',
          title: 'Le cabinet de consultation principal',
          description:
            "Bureau orienté vers la fenêtre pour une lumière naturelle optimale. Table d'examen électrique et matériel récent.",
          alt: "Cabinet de consultation lumineux avec bureau et table d'examen",
        },
        {
          url: 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1600',
          title: "L'espace d'accueil rénové",
          description: "Comptoir d'accueil revisité, espace ouvert pour fluidifier les flux patients.",
          alt: "Comptoir d'accueil moderne avec plantes vertes",
        },
      ],
    },
  },

  toolContentSection: {
    description:
      'Carte structurée : titre + sous-titre + vidéo (optionnelle) + bloc « avantages » avec checklist + paragraphe + sous-blocs libres.',
    whenToUse:
      "Présenter un outil avec un layout récurrent (vidéo + bénéfices). C'est ce qui produit la carte « Les avantages » avec checkmarks verts. Tu peux empiler d'autres blocs (texte, key points, FAQ…) en-dessous via la section « Sous-blocs additionnels ».",
    payload: {
      title: 'Le click to call',
      subtitle: 'La fin des appels masqués',
      advantageTitle: 'Les avantages',
      advantagePoints: [
        'Rappeler un patient, en dehors du cabinet médical',
        'Faire une téléconsultation par téléphone',
        'Rappeler un patient depuis la messagerie MadeForMed',
        'Télétravailler, pour vous ou votre secrétaire',
      ],
      advantageText:
        "Vous appelez avec le Click-to-Call, d'un simple clic en étant assuré de ne jamais dévoiler votre numéro personnel. Votre patient est informé que c'est son médecin qui l'appelle.",
      children: [
        {
          type: 'text',
          payload: {
            html: "Tu peux ajouter ici n'importe quel bloc supplémentaire (texte libre, key points, FAQ, etc.) via la section « Sous-blocs additionnels » de l'éditeur.",
            variant: 'default',
          },
        },
      ],
    },
  },
};
