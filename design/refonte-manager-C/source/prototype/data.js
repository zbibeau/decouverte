/* ============================================================
   Prototype Manager — Direction C (Studio dark / command)
   Données : types de blocs, variables, seed du chapitre.
   Aligné sur shared/content-schema.ts (card.children,
   conditional.then/else, toolContentSection).
   ============================================================ */

const BLOCK_TYPES = {
  heroTitle:         { label: 'Hero',          glyph: 'H', cat: 'Structure',  desc: 'Titre d’ouverture du chapitre, pleine page violette.' },
  text:              { label: 'Texte',         glyph: '¶', cat: 'Contenu',    desc: 'Un paragraphe rédactionnel sur fond crème.' },
  keyPointsCard:     { label: 'Key points',    glyph: '◆', cat: 'Contenu',    desc: 'Carte blanche : ampoule + liste de points cochés.' },
  faqCard:           { label: 'FAQ',           glyph: '▦', cat: 'Contenu',    desc: 'Questions / réponses dépliables.' },
  toolContentSection:{ label: 'Section outil', glyph: '❖', cat: 'Contenu',    desc: 'Section riche : titre, sous-titre, carte avantages.' },
  video:             { label: 'Vidéo',         glyph: '▶', cat: 'Média',      desc: 'Une vidéo Vimeo plein cadre arrondi.' },
  card:              { label: 'Card',          glyph: '▤', cat: 'Conteneur',  desc: 'Conteneur blanc qui regroupe des sous-blocs.' },
  conditional:       { label: 'Conditionnel',  glyph: '⎇', cat: 'Logique',    desc: 'Affiche Alors / Sinon selon une variable.' },
  form:              { label: 'Formulaire',    glyph: '✎', cat: 'Conversion', desc: 'Formulaire de qualification / prise de RDV.' },
};

const CATEGORIES = ['Structure', 'Contenu', 'Média', 'Conteneur', 'Logique', 'Conversion'];

// Pas de hero imbriqué ; tout le reste est légitime en sous-bloc.
const NESTABLE = ['text', 'keyPointsCard', 'faqCard', 'toolContentSection', 'video', 'card', 'conditional', 'form'];

// Variables typées (calquées sur le manager : logicielMedecin seedé, etc.)
const VARIABLES = [
  { key: 'logicielMedecin', label: 'Logiciel du médecin', options: ['Weda', 'Doctolib', 'Maiia', 'Autre'] },
  { key: 'typeExercice',    label: 'Type d’exercice',     options: ['Seul', 'Cabinet de groupe'] },
];
const OPERATORS = ['=', '!=', 'in'];

let __uid = 100;
const newId = () => 'b' + (++__uid);

function sampleFor(type) {
  switch (type) {
    case 'heroTitle':    return { number: 1, title: 'Titre du chapitre' };
    case 'text':         return { html: 'Un nouveau paragraphe. Cliquez pour le rédiger.' };
    case 'keyPointsCard':return { title: 'Ce que vous gagnez', items: ['Premier point clé', 'Deuxième point clé'] };
    case 'faqCard':      return { questions: [{ q: 'Une question fréquente ?', a: 'La réponse apportée ici.' }] };
    case 'video':        return { src: 'vimeo/000000', caption: 'Légende de la vidéo' };
    case 'card':         return { title: 'Titre de la card', children: [] };
    case 'form':         return { title: 'Pour une démo personnalisée', cta: 'Continuer', fields: ['Votre spécialité', 'Logiciel actuel'] };
    case 'conditional':  return {
      condition: { variable: 'logicielMedecin', op: '=', value: 'Weda' },
      then: [{ id: newId(), type: 'text', payload: { html: 'Bonne nouvelle : nous sommes nativement compatibles avec Weda.' } }],
      else: [{ id: newId(), type: 'text', payload: { html: 'Nous nous connectons à la plupart des logiciels du marché.' } }],
    };
    case 'toolContentSection': return {
      title: 'Votre nouvel assistant', subtitle: 'En un coup d’œil',
      advantageTitle: 'Les avantages',
      advantagePoints: ['Zéro appel manqué', 'Agenda toujours synchronisé', 'Patients rappelés automatiquement'],
      children: [],
    };
    default: return {};
  }
}

function makeBlock(type) {
  return { id: newId(), type, payload: sampleFor(type) };
}

const SEED = {
  parcours: 'Démo ventes',
  chapter: { number: 1, title: 'Mieux gérer votre cabinet' },
  blocks: [
    { id: 'b1', type: 'heroTitle', payload: { number: 1, title: 'Mieux gérer votre cabinet' } },
    { id: 'b2', type: 'video', payload: { src: 'vimeo/849213', caption: 'Présentation — 1 min 40' } },
    {
      id: 'b3', type: 'card',
      payload: {
        title: 'Pourquoi ça change tout',
        children: [
          { id: 'b3a', type: 'text', payload: { html: 'Un assistant qui décroche le téléphone à votre place, prend les rendez-vous et filtre les urgences.' } },
          { id: 'b3b', type: 'keyPointsCard', payload: { title: 'Ce que vous gagnez', items: ['Moins d’appels manqués', 'Un agenda toujours à jour', 'Du temps pour vos patients'] } },
        ],
      },
    },
    {
      id: 'b4', type: 'conditional',
      payload: {
        condition: { variable: 'logicielMedecin', op: '=', value: 'Weda' },
        then: [{ id: 'b4t', type: 'text', payload: { html: 'Comme vous utilisez Weda, la synchronisation est immédiate.' } }],
        else: [{ id: 'b4e', type: 'text', payload: { html: 'Quel que soit votre logiciel, nous trouvons une passerelle.' } }],
      },
    },
    { id: 'b5', type: 'form', payload: { title: 'Pour une démo personnalisée', cta: 'Continuer', fields: ['Votre spécialité', 'Logiciel actuel'] } },
  ],
};

Object.assign(window, { BLOCK_TYPES, CATEGORIES, NESTABLE, VARIABLES, OPERATORS, newId, sampleFor, makeBlock, SEED });
