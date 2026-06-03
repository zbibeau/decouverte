-- Seed des options de la variable `logicielMedecin` : liste des logiciels
-- métier médicaux candidats côté front.
--
-- UPDATE non-destructif scopé à la clé : si plusieurs parcours portent une
-- variable nommée `logicielMedecin`, tous reçoivent la même liste (vocabulaire
-- commun). Pour scoper à un parcours spécifique, ajoute un filtre :
--   AND parcours_id = (SELECT id FROM parcours WHERE slug = 'odaiji')
--
-- `value` = `label` partout (= ce que l'utilisateur saisit dans les 2 colonnes
-- du `OptionsListInput`). Si tu veux raccourcir des labels (ex. « Cegedim -
-- MLM » → label « MLM »), édite la ligne correspondante dans le JSON ci-dessous
-- ou via l'UI Variables après application.
--
-- Dollar-quoting `$$…$$` pour ne pas avoir à doubler les apostrophes
-- (`Med'Oc`).

UPDATE variable
SET options = $$[
  {"value":"Weda","label":"Weda"},
  {"value":"Doctolib","label":"Doctolib"},
  {"value":"Dr Santé","label":"Dr Santé"},
  {"value":"AlmaPro","label":"AlmaPro"},
  {"value":"MediStory","label":"MediStory"},
  {"value":"Xmed","label":"Xmed"},
  {"value":"Shaman","label":"Shaman"},
  {"value":"Cegedim - MLM","label":"Cegedim - MLM"},
  {"value":"Cegedim - Maiia Médecin","label":"Cegedim - Maiia Médecin"},
  {"value":"Cegedim - CrossWay","label":"Cegedim - CrossWay"},
  {"value":"Cegedim - MédiClick","label":"Cegedim - MédiClick"},
  {"value":"Cegedim - Medimust","label":"Cegedim - Medimust"},
  {"value":"CGM - Acteur","label":"CGM - Acteur"},
  {"value":"CGM - Axisanté","label":"CGM - Axisanté"},
  {"value":"CGM - Hellodoc","label":"CGM - Hellodoc"},
  {"value":"CGM - MédicalNET","label":"CGM - MédicalNET"},
  {"value":"Medilink","label":"Medilink"},
  {"value":"Easy-care (Calimed / Sephira)","label":"Easy-care (Calimed / Sephira)"},
  {"value":"ICT - Chorus","label":"ICT - Chorus"},
  {"value":"TAMM","label":"TAMM"},
  {"value":"Desmos","label":"Desmos"},
  {"value":"Med'Oc","label":"Med'Oc"},
  {"value":"ÉO","label":"ÉO"},
  {"value":"Odaiji","label":"Odaiji"},
  {"value":"PremioCare","label":"PremioCare"},
  {"value":"Médicab","label":"Médicab"},
  {"value":"Maidis","label":"Maidis"},
  {"value":"Aucun","label":"Aucun"}
]$$::jsonb
WHERE key = 'logicielMedecin';
