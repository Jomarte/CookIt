export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  cookingType: string;
  followers: number;
  following: number;
  recipesCount: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  category: 'Proteína' | 'Legumes' | 'Laticínios' | 'Grãos' | 'Condimentos' | 'Outros';
}

export interface Step {
  number: number;
  description: string;
  duration?: number;
}

export interface Recipe {
  id: string;
  title: string;
  image: string;
  authorId: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  category: string;
  tags: string[];
  ingredients: Ingredient[];
  steps: Step[];
  likes: number;
  saves: number;
  cookedCount: number;
  rating: number;
  ratingCount: number;
  calories?: number;
  cost?: string;
  diet: string[];
  createdAt: string;
}

export const USERS: User[] = [
  {
    id: 'u1',
    name: 'Ana Silva',
    username: 'anasilva',
    avatar: 'https://i.pravatar.cc/100?img=1',
    bio: 'Cozinheira caseira apaixonada por comida portuguesa',
    cookingType: 'Caseiro',
    followers: 1243,
    following: 456,
    recipesCount: 38,
    badges: [
      { id: 'b1', name: '1ª Receita', icon: '🌟', color: '#FFD700' },
      { id: 'b2', name: '10 Testadas', icon: '👨‍🍳', color: '#FF6B35' },
    ],
  },
  {
    id: 'u2',
    name: 'Miguel Costa',
    username: 'miguelcook',
    avatar: 'https://i.pravatar.cc/100?img=3',
    bio: 'Especialista em massas italianas e sobremesas',
    cookingType: 'Gourmet',
    followers: 3891,
    following: 123,
    recipesCount: 72,
    badges: [
      { id: 'b1', name: 'Mestre das Massas', icon: '🍝', color: '#E91E63' },
      { id: 'b3', name: 'Rei Sobremesas', icon: '🍰', color: '#9C27B0' },
    ],
  },
  {
    id: 'u3',
    name: 'Sofia Rodrigues',
    username: 'sofiacooks',
    avatar: 'https://i.pravatar.cc/100?img=5',
    bio: 'Fit foodie | Meal prep | Alta proteína',
    cookingType: 'Fit',
    followers: 5620,
    following: 890,
    recipesCount: 94,
    badges: [{ id: 'b4', name: 'Fitness Chef', icon: '💪', color: '#4CAF50' }],
  },
  {
    id: 'u4',
    name: 'Pedro Ferreira',
    username: 'pedroferreira',
    avatar: 'https://i.pravatar.cc/100?img=7',
    bio: 'Cozinha vegetariana e vegan',
    cookingType: 'Vegetariano',
    followers: 2134,
    following: 567,
    recipesCount: 45,
    badges: [],
  },
];

export const RECIPES: Recipe[] = [
  {
    id: 'r1',
    title: 'Bacalhau à Brás',
    image: 'https://picsum.photos/seed/bacalhau01/800/500',
    authorId: 'u1',
    prepTime: 20,
    cookTime: 25,
    servings: 4,
    difficulty: 'Médio',
    category: 'Comida Portuguesa',
    tags: ['português', 'peixe', 'ovos', 'tradicional'],
    diet: [],
    calories: 420,
    cost: '€€',
    likes: 347,
    saves: 189,
    cookedCount: 234,
    rating: 4.8,
    ratingCount: 127,
    createdAt: '2024-01-15',
    ingredients: [
      { id: 'i1', name: 'Bacalhau desfiado', amount: '400', unit: 'g', category: 'Proteína' },
      { id: 'i2', name: 'Ovos', amount: '4', unit: 'unid', category: 'Proteína' },
      { id: 'i3', name: 'Batata palha', amount: '200', unit: 'g', category: 'Grãos' },
      { id: 'i4', name: 'Cebola', amount: '2', unit: 'unid', category: 'Legumes' },
      { id: 'i5', name: 'Alho', amount: '3', unit: 'dentes', category: 'Condimentos' },
      { id: 'i6', name: 'Azeite', amount: '4', unit: 'c. sopa', category: 'Condimentos' },
      { id: 'i7', name: 'Salsa', amount: 'q.b.', unit: '', category: 'Condimentos' },
      { id: 'i8', name: 'Azeitonas pretas', amount: '100', unit: 'g', category: 'Outros' },
    ],
    steps: [
      { number: 1, description: 'Demolhar o bacalhau durante 24h, mudando a água várias vezes. Desfiar e retirar peles e espinhas.' },
      { number: 2, description: 'Picar a cebola e o alho. Refogar em azeite até dourar.', duration: 5 },
      { number: 3, description: 'Adicionar o bacalhau desfiado e saltear durante 5 minutos.', duration: 5 },
      { number: 4, description: 'Juntar a batata palha e mexer bem.' },
      { number: 5, description: 'Bater os ovos levemente e adicionar ao preparado. Mexer até os ovos estarem cremosos — não secos.', duration: 3 },
      { number: 6, description: 'Servir com salsa picada e azeitonas pretas.' },
    ],
  },
  {
    id: 'r2',
    title: 'Frango Assado com Batata',
    image: 'https://picsum.photos/seed/frango02/800/500',
    authorId: 'u2',
    prepTime: 15,
    cookTime: 60,
    servings: 4,
    difficulty: 'Fácil',
    category: 'Carnes',
    tags: ['frango', 'forno', 'português', 'família'],
    diet: ['sem glúten'],
    calories: 380,
    cost: '€',
    likes: 523,
    saves: 312,
    cookedCount: 445,
    rating: 4.9,
    ratingCount: 203,
    createdAt: '2024-01-20',
    ingredients: [
      { id: 'i1', name: 'Frango inteiro', amount: '1.5', unit: 'kg', category: 'Proteína' },
      { id: 'i2', name: 'Batata', amount: '800', unit: 'g', category: 'Legumes' },
      { id: 'i3', name: 'Limão', amount: '1', unit: 'unid', category: 'Outros' },
      { id: 'i4', name: 'Alho', amount: '6', unit: 'dentes', category: 'Condimentos' },
      { id: 'i5', name: 'Paprika fumada', amount: '1', unit: 'c. sopa', category: 'Condimentos' },
      { id: 'i6', name: 'Azeite', amount: '3', unit: 'c. sopa', category: 'Condimentos' },
      { id: 'i7', name: 'Sal e pimenta', amount: 'q.b.', unit: '', category: 'Condimentos' },
    ],
    steps: [
      { number: 1, description: 'Pré-aquecer o forno a 200°C.' },
      { number: 2, description: 'Fazer uma pasta com alho picado, paprika, azeite, sal e sumo de limão. Esfregar bem no frango por dentro e por fora.' },
      { number: 3, description: 'Cortar as batatas em quartos e temperar com sal e azeite.' },
      { number: 4, description: 'Colocar o frango numa assadeira rodeado pelas batatas.' },
      { number: 5, description: 'Assar por 60 minutos. A meio do tempo virar as batatas e regar com os sucos da assadeira.', duration: 60 },
      { number: 6, description: 'Verificar cozedura: cortar na coxa mais grossa — o sumo deve sair claro.' },
    ],
  },
  {
    id: 'r3',
    title: 'Ovos Mexidos com Linguiça',
    image: 'https://picsum.photos/seed/ovos03/800/500',
    authorId: 'u3',
    prepTime: 5,
    cookTime: 10,
    servings: 2,
    difficulty: 'Fácil',
    category: 'Pequeno-almoço',
    tags: ['rápido', 'ovos', 'pequeno-almoço', 'proteína'],
    diet: ['sem glúten'],
    calories: 290,
    cost: '€',
    likes: 189,
    saves: 98,
    cookedCount: 167,
    rating: 4.6,
    ratingCount: 84,
    createdAt: '2024-02-01',
    ingredients: [
      { id: 'i1', name: 'Ovos', amount: '4', unit: 'unid', category: 'Proteína' },
      { id: 'i2', name: 'Linguiça', amount: '100', unit: 'g', category: 'Proteína' },
      { id: 'i3', name: 'Manteiga', amount: '1', unit: 'c. sopa', category: 'Laticínios' },
      { id: 'i4', name: 'Sal e pimenta', amount: 'q.b.', unit: '', category: 'Condimentos' },
    ],
    steps: [
      { number: 1, description: 'Cortar a linguiça em rodelas finas.' },
      { number: 2, description: 'Saltear a linguiça numa frigideira por 3 minutos.', duration: 3 },
      { number: 3, description: 'Bater os ovos com uma pitada de sal.' },
      { number: 4, description: 'Derreter manteiga, adicionar os ovos e mexer em lume brando até cremosos.', duration: 4 },
      { number: 5, description: 'Juntar a linguiça, misturar e servir imediatamente.' },
    ],
  },
  {
    id: 'r4',
    title: 'Tarte de Limão',
    image: 'https://picsum.photos/seed/tarte04/800/500',
    authorId: 'u2',
    prepTime: 30,
    cookTime: 25,
    servings: 8,
    difficulty: 'Médio',
    category: 'Sobremesas',
    tags: ['sobremesa', 'limão', 'tarte', 'vegetariano'],
    diet: ['vegetariano'],
    calories: 310,
    cost: '€€',
    likes: 412,
    saves: 287,
    cookedCount: 198,
    rating: 4.9,
    ratingCount: 156,
    createdAt: '2024-02-10',
    ingredients: [
      { id: 'i1', name: 'Bolacha maria', amount: '200', unit: 'g', category: 'Grãos' },
      { id: 'i2', name: 'Manteiga', amount: '100', unit: 'g', category: 'Laticínios' },
      { id: 'i3', name: 'Leite condensado', amount: '400', unit: 'g', category: 'Laticínios' },
      { id: 'i4', name: 'Sumo de limão', amount: '120', unit: 'ml', category: 'Outros' },
      { id: 'i5', name: 'Ovos', amount: '3', unit: 'unid', category: 'Proteína' },
      { id: 'i6', name: 'Raspa de limão', amount: '1', unit: 'unid', category: 'Condimentos' },
    ],
    steps: [
      { number: 1, description: 'Triturar as bolachas e misturar com manteiga derretida. Forrar uma tarteira de 23cm e refrigerar 20 minutos.' },
      { number: 2, description: 'Misturar o leite condensado com os ovos, sumo e raspa de limão.' },
      { number: 3, description: 'Verter o recheio sobre a base de bolacha.' },
      { number: 4, description: 'Cozer em forno pré-aquecido a 175°C durante 25 minutos.', duration: 25 },
      { number: 5, description: 'Deixar arrefecer completamente. Refrigerar pelo menos 2 horas antes de servir.' },
    ],
  },
  {
    id: 'r5',
    title: 'Sopa de Legumes',
    image: 'https://picsum.photos/seed/sopa05/800/500',
    authorId: 'u4',
    prepTime: 15,
    cookTime: 30,
    servings: 6,
    difficulty: 'Fácil',
    category: 'Sopas',
    tags: ['vegan', 'saudável', 'barato', 'sopa'],
    diet: ['vegan', 'vegetariano', 'sem glúten'],
    calories: 120,
    cost: '€',
    likes: 234,
    saves: 156,
    cookedCount: 289,
    rating: 4.7,
    ratingCount: 98,
    createdAt: '2024-02-15',
    ingredients: [
      { id: 'i1', name: 'Cenoura', amount: '3', unit: 'unid', category: 'Legumes' },
      { id: 'i2', name: 'Batata', amount: '3', unit: 'unid', category: 'Legumes' },
      { id: 'i3', name: 'Courgette', amount: '1', unit: 'unid', category: 'Legumes' },
      { id: 'i4', name: 'Alho francês', amount: '1', unit: 'unid', category: 'Legumes' },
      { id: 'i5', name: 'Caldo de legumes', amount: '1.5', unit: 'L', category: 'Condimentos' },
      { id: 'i6', name: 'Azeite', amount: '2', unit: 'c. sopa', category: 'Condimentos' },
      { id: 'i7', name: 'Sal e pimenta', amount: 'q.b.', unit: '', category: 'Condimentos' },
    ],
    steps: [
      { number: 1, description: 'Cortar todos os legumes em pedaços grosseiros.' },
      { number: 2, description: 'Numa panela grande, refogar o alho francês em azeite por 3 minutos.', duration: 3 },
      { number: 3, description: 'Adicionar os restantes legumes e o caldo.' },
      { number: 4, description: 'Cozinhar em lume médio por 25 minutos até os legumes estarem macios.', duration: 25 },
      { number: 5, description: 'Triturar até obter textura cremosa. Ajustar temperos.' },
    ],
  },
  {
    id: 'r6',
    title: 'Arroz de Atum',
    image: 'https://picsum.photos/seed/arroz06/800/500',
    authorId: 'u1',
    prepTime: 5,
    cookTime: 20,
    servings: 3,
    difficulty: 'Fácil',
    category: 'Peixe',
    tags: ['rápido', 'barato', 'atum', 'arroz'],
    diet: [],
    calories: 350,
    cost: '€',
    likes: 156,
    saves: 112,
    cookedCount: 345,
    rating: 4.5,
    ratingCount: 67,
    createdAt: '2024-03-01',
    ingredients: [
      { id: 'i1', name: 'Arroz agulha', amount: '300', unit: 'g', category: 'Grãos' },
      { id: 'i2', name: 'Atum em lata', amount: '2', unit: 'latas', category: 'Proteína' },
      { id: 'i3', name: 'Tomate', amount: '2', unit: 'unid', category: 'Legumes' },
      { id: 'i4', name: 'Cebola', amount: '1', unit: 'unid', category: 'Legumes' },
      { id: 'i5', name: 'Alho', amount: '2', unit: 'dentes', category: 'Condimentos' },
      { id: 'i6', name: 'Polpa de tomate', amount: '2', unit: 'c. sopa', category: 'Condimentos' },
      { id: 'i7', name: 'Azeite', amount: '2', unit: 'c. sopa', category: 'Condimentos' },
    ],
    steps: [
      { number: 1, description: 'Refogar cebola e alho picados em azeite até dourar.' },
      { number: 2, description: 'Adicionar o tomate em pedaços e a polpa. Cozinhar 5 minutos.', duration: 5 },
      { number: 3, description: 'Juntar o arroz e cobrir com água quente (dobro do volume do arroz).' },
      { number: 4, description: 'Cozinhar em lume médio 15 minutos.', duration: 15 },
      { number: 5, description: 'Quando o arroz estiver quase pronto, adicionar o atum e misturar.' },
      { number: 6, description: 'Servir com salsa picada.' },
    ],
  },
  {
    id: 'r7',
    title: 'Bifanas no Pão',
    image: 'https://picsum.photos/seed/bifana07/800/500',
    authorId: 'u1',
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    difficulty: 'Fácil',
    category: 'Street Food',
    tags: ['português', 'rápido', 'street food', 'carne'],
    diet: [],
    calories: 450,
    cost: '€',
    likes: 389,
    saves: 201,
    cookedCount: 312,
    rating: 4.8,
    ratingCount: 143,
    createdAt: '2024-03-10',
    ingredients: [
      { id: 'i1', name: 'Bifanas (lombo de porco)', amount: '600', unit: 'g', category: 'Proteína' },
      { id: 'i2', name: 'Papo-secos', amount: '4', unit: 'unid', category: 'Grãos' },
      { id: 'i3', name: 'Alho', amount: '4', unit: 'dentes', category: 'Condimentos' },
      { id: 'i4', name: 'Cerveja', amount: '200', unit: 'ml', category: 'Outros' },
      { id: 'i5', name: 'Pimenta', amount: '1', unit: 'c. chá', category: 'Condimentos' },
      { id: 'i6', name: 'Massa de pimentão', amount: '1', unit: 'c. sopa', category: 'Condimentos' },
      { id: 'i7', name: 'Azeite', amount: '2', unit: 'c. sopa', category: 'Condimentos' },
    ],
    steps: [
      { number: 1, description: 'Marinar as bifanas com alho esmagado, pimenta, massa de pimentão e cerveja. Mínimo 30 minutos.' },
      { number: 2, description: 'Aquecer azeite numa frigideira em lume alto.' },
      { number: 3, description: 'Fritar as bifanas 2-3 minutos de cada lado até dourar.', duration: 6 },
      { number: 4, description: 'Adicionar a marinada e deixar reduzir 5 minutos.', duration: 5 },
      { number: 5, description: 'Servir nos papo-secos com mostarda a gosto.' },
    ],
  },
  {
    id: 'r8',
    title: 'Salada de Grão com Atum',
    image: 'https://picsum.photos/seed/salada08/800/500',
    authorId: 'u3',
    prepTime: 10,
    cookTime: 0,
    servings: 2,
    difficulty: 'Fácil',
    category: 'Saladas',
    tags: ['rápido', 'saudável', 'sem cozedura', 'proteína', 'meal prep'],
    diet: ['sem glúten'],
    calories: 340,
    cost: '€',
    likes: 267,
    saves: 198,
    cookedCount: 423,
    rating: 4.7,
    ratingCount: 112,
    createdAt: '2024-03-20',
    ingredients: [
      { id: 'i1', name: 'Grão cozido', amount: '400', unit: 'g', category: 'Grãos' },
      { id: 'i2', name: 'Atum em lata', amount: '2', unit: 'latas', category: 'Proteína' },
      { id: 'i3', name: 'Tomate cherry', amount: '150', unit: 'g', category: 'Legumes' },
      { id: 'i4', name: 'Pepino', amount: '1', unit: 'unid', category: 'Legumes' },
      { id: 'i5', name: 'Cebola roxa', amount: '1/2', unit: 'unid', category: 'Legumes' },
      { id: 'i6', name: 'Azeite', amount: '3', unit: 'c. sopa', category: 'Condimentos' },
      { id: 'i7', name: 'Sumo de limão', amount: '1', unit: 'unid', category: 'Condimentos' },
      { id: 'i8', name: 'Sal e pimenta', amount: 'q.b.', unit: '', category: 'Condimentos' },
    ],
    steps: [
      { number: 1, description: 'Escorrer o grão e o atum.' },
      { number: 2, description: 'Cortar o tomate cherry ao meio, o pepino em cubos e a cebola roxa em meias-luas finas.' },
      { number: 3, description: 'Misturar tudo numa taça grande.' },
      { number: 4, description: 'Temperar com azeite, sumo de limão, sal e pimenta. Misturar bem.' },
      { number: 5, description: 'Servir fresco ou guardar no frigorífico até 3 dias.' },
    ],
  },
];
