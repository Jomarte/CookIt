export interface IngredientEntry {
  name: string;
  category: string;
}

export const CANONICAL_INGREDIENTS: IngredientEntry[] = [
  // Carnes
  { name: 'Frango', category: 'Carnes' },
  { name: 'Carne de Vaca', category: 'Carnes' },
  { name: 'Porco', category: 'Carnes' },
  { name: 'Borrego', category: 'Carnes' },
  { name: 'Peru', category: 'Carnes' },
  { name: 'Pato', category: 'Carnes' },
  { name: 'Coelho', category: 'Carnes' },
  { name: 'Vitela', category: 'Carnes' },
  { name: 'Chouriço', category: 'Carnes' },
  { name: 'Linguiça', category: 'Carnes' },
  { name: 'Alheira', category: 'Carnes' },
  { name: 'Presunto', category: 'Carnes' },
  { name: 'Bacon', category: 'Carnes' },
  { name: 'Salsicha', category: 'Carnes' },
  { name: 'Morcela', category: 'Carnes' },
  { name: 'Carne Picada', category: 'Carnes' },
  { name: 'Entrecosto', category: 'Carnes' },
  { name: 'Costeleta', category: 'Carnes' },

  // Peixe e Marisco
  { name: 'Bacalhau', category: 'Peixe e Marisco' },
  { name: 'Sardinha', category: 'Peixe e Marisco' },
  { name: 'Salmão', category: 'Peixe e Marisco' },
  { name: 'Atum', category: 'Peixe e Marisco' },
  { name: 'Dourada', category: 'Peixe e Marisco' },
  { name: 'Robalo', category: 'Peixe e Marisco' },
  { name: 'Camarão', category: 'Peixe e Marisco' },
  { name: 'Gambas', category: 'Peixe e Marisco' },
  { name: 'Lula', category: 'Peixe e Marisco' },
  { name: 'Polvo', category: 'Peixe e Marisco' },
  { name: 'Amêijoa', category: 'Peixe e Marisco' },
  { name: 'Mexilhão', category: 'Peixe e Marisco' },
  { name: 'Truta', category: 'Peixe e Marisco' },
  { name: 'Perca', category: 'Peixe e Marisco' },
  { name: 'Linguado', category: 'Peixe e Marisco' },
  { name: 'Pargo', category: 'Peixe e Marisco' },

  // Vegetais
  { name: 'Tomate', category: 'Vegetais' },
  { name: 'Cebola', category: 'Vegetais' },
  { name: 'Alho', category: 'Vegetais' },
  { name: 'Batata', category: 'Vegetais' },
  { name: 'Cenoura', category: 'Vegetais' },
  { name: 'Pimento', category: 'Vegetais' },
  { name: 'Pimento Vermelho', category: 'Vegetais' },
  { name: 'Pimento Verde', category: 'Vegetais' },
  { name: 'Courgette', category: 'Vegetais' },
  { name: 'Beringela', category: 'Vegetais' },
  { name: 'Espinafres', category: 'Vegetais' },
  { name: 'Brócolos', category: 'Vegetais' },
  { name: 'Couve', category: 'Vegetais' },
  { name: 'Couve-flor', category: 'Vegetais' },
  { name: 'Alface', category: 'Vegetais' },
  { name: 'Pepino', category: 'Vegetais' },
  { name: 'Cogumelos', category: 'Vegetais' },
  { name: 'Ervilhas', category: 'Vegetais' },
  { name: 'Feijão Verde', category: 'Vegetais' },
  { name: 'Milho', category: 'Vegetais' },
  { name: 'Beterraba', category: 'Vegetais' },
  { name: 'Nabo', category: 'Vegetais' },
  { name: 'Alho-Francês', category: 'Vegetais' },
  { name: 'Aipo', category: 'Vegetais' },
  { name: 'Abóbora', category: 'Vegetais' },
  { name: 'Grelos', category: 'Vegetais' },
  { name: 'Nabiça', category: 'Vegetais' },
  { name: 'Chuchu', category: 'Vegetais' },

  // Fruta
  { name: 'Limão', category: 'Fruta' },
  { name: 'Laranja', category: 'Fruta' },
  { name: 'Maçã', category: 'Fruta' },
  { name: 'Pera', category: 'Fruta' },
  { name: 'Banana', category: 'Fruta' },
  { name: 'Morango', category: 'Fruta' },
  { name: 'Uva', category: 'Fruta' },
  { name: 'Pêssego', category: 'Fruta' },
  { name: 'Kiwi', category: 'Fruta' },
  { name: 'Melão', category: 'Fruta' },
  { name: 'Melancia', category: 'Fruta' },
  { name: 'Ananás', category: 'Fruta' },
  { name: 'Manga', category: 'Fruta' },
  { name: 'Framboesa', category: 'Fruta' },
  { name: 'Mirtilo', category: 'Fruta' },
  { name: 'Lima', category: 'Fruta' },

  // Lacticínios e Ovos
  { name: 'Ovo', category: 'Lacticínios e Ovos' },
  { name: 'Leite', category: 'Lacticínios e Ovos' },
  { name: 'Manteiga', category: 'Lacticínios e Ovos' },
  { name: 'Queijo', category: 'Lacticínios e Ovos' },
  { name: 'Queijo Mozzarella', category: 'Lacticínios e Ovos' },
  { name: 'Queijo Parmesão', category: 'Lacticínios e Ovos' },
  { name: 'Queijo Ricotta', category: 'Lacticínios e Ovos' },
  { name: 'Queijo Feta', category: 'Lacticínios e Ovos' },
  { name: 'Natas', category: 'Lacticínios e Ovos' },
  { name: 'Iogurte', category: 'Lacticínios e Ovos' },
  { name: 'Requeijão', category: 'Lacticínios e Ovos' },
  { name: 'Creme de Leite', category: 'Lacticínios e Ovos' },
  { name: 'Leite de Coco', category: 'Lacticínios e Ovos' },

  // Cereais e Massas
  { name: 'Arroz', category: 'Cereais e Massas' },
  { name: 'Massa', category: 'Cereais e Massas' },
  { name: 'Esparguete', category: 'Cereais e Massas' },
  { name: 'Penne', category: 'Cereais e Massas' },
  { name: 'Tagliatelle', category: 'Cereais e Massas' },
  { name: 'Macarrão', category: 'Cereais e Massas' },
  { name: 'Lasanha', category: 'Cereais e Massas' },
  { name: 'Farinha', category: 'Cereais e Massas' },
  { name: 'Pão', category: 'Cereais e Massas' },
  { name: 'Massa Folhada', category: 'Cereais e Massas' },
  { name: 'Aveia', category: 'Cereais e Massas' },
  { name: 'Cuscuz', category: 'Cereais e Massas' },
  { name: 'Quinoa', category: 'Cereais e Massas' },
  { name: 'Pão Ralado', category: 'Cereais e Massas' },
  { name: 'Massa Quebrada', category: 'Cereais e Massas' },

  // Leguminosas
  { name: 'Feijão', category: 'Leguminosas' },
  { name: 'Feijão Preto', category: 'Leguminosas' },
  { name: 'Feijão Encarnado', category: 'Leguminosas' },
  { name: 'Grão-de-Bico', category: 'Leguminosas' },
  { name: 'Lentilhas', category: 'Leguminosas' },
  { name: 'Ervilhas Secas', category: 'Leguminosas' },
  { name: 'Favas', category: 'Leguminosas' },
  { name: 'Soja', category: 'Leguminosas' },

  // Especiarias e Ervas
  { name: 'Sal', category: 'Especiarias e Ervas' },
  { name: 'Pimenta', category: 'Especiarias e Ervas' },
  { name: 'Paprika', category: 'Especiarias e Ervas' },
  { name: 'Colorau', category: 'Especiarias e Ervas' },
  { name: 'Cominhos', category: 'Especiarias e Ervas' },
  { name: 'Açafrão', category: 'Especiarias e Ervas' },
  { name: 'Louro', category: 'Especiarias e Ervas' },
  { name: 'Salsa', category: 'Especiarias e Ervas' },
  { name: 'Coentros', category: 'Especiarias e Ervas' },
  { name: 'Orégãos', category: 'Especiarias e Ervas' },
  { name: 'Tomilho', category: 'Especiarias e Ervas' },
  { name: 'Rosmaninho', category: 'Especiarias e Ervas' },
  { name: 'Manjericão', category: 'Especiarias e Ervas' },
  { name: 'Canela', category: 'Especiarias e Ervas' },
  { name: 'Noz-Moscada', category: 'Especiarias e Ervas' },
  { name: 'Piri-Piri', category: 'Especiarias e Ervas' },
  { name: 'Caril', category: 'Especiarias e Ervas' },
  { name: 'Gengibre', category: 'Especiarias e Ervas' },
  { name: 'Alho em Pó', category: 'Especiarias e Ervas' },
  { name: 'Cebola em Pó', category: 'Especiarias e Ervas' },
  { name: 'Estragão', category: 'Especiarias e Ervas' },

  // Óleos e Molhos
  { name: 'Azeite', category: 'Óleos e Molhos' },
  { name: 'Óleo', category: 'Óleos e Molhos' },
  { name: 'Vinagre', category: 'Óleos e Molhos' },
  { name: 'Molho de Soja', category: 'Óleos e Molhos' },
  { name: 'Molho de Tomate', category: 'Óleos e Molhos' },
  { name: 'Ketchup', category: 'Óleos e Molhos' },
  { name: 'Maionese', category: 'Óleos e Molhos' },
  { name: 'Mostarda', category: 'Óleos e Molhos' },
  { name: 'Molho Inglês', category: 'Óleos e Molhos' },
  { name: 'Vinagre Balsâmico', category: 'Óleos e Molhos' },

  // Frutos Secos
  { name: 'Amêndoa', category: 'Frutos Secos' },
  { name: 'Noz', category: 'Frutos Secos' },
  { name: 'Avelã', category: 'Frutos Secos' },
  { name: 'Amendoim', category: 'Frutos Secos' },
  { name: 'Pinhão', category: 'Frutos Secos' },
  { name: 'Castanha', category: 'Frutos Secos' },
  { name: 'Passas', category: 'Frutos Secos' },

  // Outros
  { name: 'Açúcar', category: 'Outros' },
  { name: 'Açúcar Mascavado', category: 'Outros' },
  { name: 'Mel', category: 'Outros' },
  { name: 'Chocolate', category: 'Outros' },
  { name: 'Chocolate Negro', category: 'Outros' },
  { name: 'Cacau', category: 'Outros' },
  { name: 'Fermento', category: 'Outros' },
  { name: 'Bicarbonato', category: 'Outros' },
  { name: 'Amido de Milho', category: 'Outros' },
  { name: 'Extrato de Tomate', category: 'Outros' },
  { name: 'Caldo de Galinha', category: 'Outros' },
  { name: 'Caldo de Carne', category: 'Outros' },
  { name: 'Vinho Branco', category: 'Outros' },
  { name: 'Vinho Tinto', category: 'Outros' },
  { name: 'Cerveja', category: 'Outros' },
  { name: 'Água', category: 'Outros' },
];

export function getIngredientSuggestions(text: string): IngredientEntry[] {
  if (!text.trim() || text.length < 1) return [];
  const lower = text.toLowerCase();
  const startsWith = CANONICAL_INGREDIENTS.filter(i =>
    i.name.toLowerCase().startsWith(lower)
  );
  const contains = CANONICAL_INGREDIENTS.filter(i =>
    !i.name.toLowerCase().startsWith(lower) &&
    i.name.toLowerCase().includes(lower)
  );
  return [...startsWith, ...contains].slice(0, 5);
}
