/**
 * `ThemeBootstrap` injecte un script INLINE dans `<head>` qui applique la
 * classe `.dark` sur `<html>` AVANT le premier paint, en lisant `localStorage`
 * (clé `manager:theme`). Sans ça, le HTML serveur est rendu en clair par
 * défaut → flash blanc à chaque navigation pour les utilisateurs en sombre.
 *
 * Le script est volontairement minuscule et synchrone : il bloque le paint
 * d'une milliseconde, mais c'est le seul moyen propre d'éviter le flash sans
 * tirer une dépendance lourde comme `next-themes`.
 *
 * Le toggle utilisateur (lune/soleil) vit dans `Sidebar.tsx` et écrit dans la
 * même clé `localStorage` + ajoute / retire la classe `.dark`.
 */
export function ThemeBootstrap() {
  return (
    // `react/no-danger` n'est pas enregistré côté ESLint du manager → on
    // n'ajoute pas de disable-comment dessus (= error rule-not-found). Le
    // plugin solid (lui enregistré, false-positive sur React) alerte sur
    // `dangerouslySetInnerHTML` ; disable explicite pour le contenir ici,
    // c'est l'API React canonique pour un script d'init synchrone dans
    // <head>, sans alternative plus propre côté Next 15.
    <script
      // eslint-disable-next-line solid/no-innerhtml
      dangerouslySetInnerHTML={{
        __html: `
          (function () {
            try {
              // Direction C (Lot 5) — dark mode FORCÉ par défaut :
              // le manager est désormais un Studio sombre. La clé
              // 'manager:theme' = 'light' reste respectée pour les
              // éditeurs qui veulent explicitement basculer ; tout
              // le reste (absent / 'dark' / null) → dark.
              var stored = localStorage.getItem('manager:theme');
              var dark = stored !== 'light';
              if (dark) document.documentElement.classList.add('dark');
            } catch (e) {
              // localStorage indisponible → dark forcé quand même,
              // pour rester cohérent avec la direction Studio.
              document.documentElement.classList.add('dark');
            }
          })();
        `,
      }}
    />
  );
}
