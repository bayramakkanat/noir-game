export const SUSPECTS = [
  { id: 0,  name: "Mira Solano",  gender: "F", hair: "black",  acc: "none",      outfit: "dress",   age: 34, motive: "Eski sevgilisinin sırrını saklamak" },
  { id: 1,  name: "Viktor Ash",   gender: "M", hair: "gray",   acc: "cigarette", outfit: "trench",  age: 52, motive: "Kaybolan mirasa el koymak" },
  { id: 2,  name: "Lena Voss",    gender: "F", hair: "blonde", acc: "glasses",   outfit: "suit",    age: 29, motive: "Rakibini meslekten silmek" },
  { id: 3,  name: "Omar Priest",  gender: "M", hair: "black",  acc: "hat",       outfit: "coat",    age: 47, motive: "Kilisenin kasasını korumak" },
  { id: 4,  name: "Ida Crane",    gender: "F", hair: "red",    acc: "earring",   outfit: "dress",   age: 38, motive: "Dedektifin notlarını yok etmek" },
  { id: 5,  name: "Rex Harlow",   gender: "M", hair: "blonde", acc: "mustache",  outfit: "suit",    age: 44, motive: "Şantaj kurbanını susturmak" },
  { id: 6,  name: "Nadia Fox",    gender: "F", hair: "black",  acc: "glasses",   outfit: "leather", age: 31, motive: "Kimliğini gizlemek" },
  { id: 7,  name: "Sal Donner",   gender: "M", hair: "black",  acc: "scar",      outfit: "vest",    age: 55, motive: "Eski ortağından intikam" },
  { id: 8,  name: "Cleo Ward",    gender: "F", hair: "blonde", acc: "none",      outfit: "dress",   age: 26, motive: "Başkasının suçunu üstlenmek" },
  { id: 9,  name: "Hugo Bell",    gender: "M", hair: "gray",   acc: "hat",       outfit: "suit",    age: 61, motive: "Otelindeki skandalı örtbas etmek" },
  { id: 10, name: "Vera Stone",   gender: "F", hair: "gray",   acc: "glasses",   outfit: "coat",    age: 58, motive: "Yeğenini korumak" },
  { id: 11, name: "Dio Marsh",    gender: "M", hair: "red",    acc: "beard",     outfit: "trench",  age: 39, motive: "Kayıp bir tanığı bulmak" },
  { id: 12, name: "Ada Quinn",    gender: "F", hair: "red",    acc: "hat",       outfit: "suit",    age: 33, motive: "Kocasının sigorta parasını almak" },
  { id: 13, name: "Knox Reed",    gender: "M", hair: "black",  acc: "none",      outfit: "uniform", age: 41, motive: "Yolsuzluk dosyasını kapatmak" },
  { id: 14, name: "Luna Fay",     gender: "F", hair: "white",  acc: "earring",   outfit: "dress",   age: 22, motive: "Ailesinin borcunu silmek" },
  { id: 15, name: "Earl Mace",    gender: "M", hair: "black",  acc: "mustache",  outfit: "vest",    age: 49, motive: "Gizli bir örgütü korumak" },
  { id: 16, name: "Iris Cole",    gender: "F", hair: "black",  acc: "none",      outfit: "coat",    age: 36, motive: "Kayıp kardeşini aramak" },
  { id: 17, name: "Bo Steele",    gender: "M", hair: "gray",   acc: "scar",      outfit: "leather", age: 45, motive: "Eski suç ortağını susturmak" },
  { id: 18, name: "Zara Moon",    gender: "F", hair: "blonde", acc: "hat",       outfit: "trench",  age: 30, motive: "Casusluk ağını gizlemek" },
  { id: 19, name: "Finn Drake",   gender: "M", hair: "red",    acc: "glasses",   outfit: "suit",    age: 35, motive: "Kız kardeşinin katilini bulmak" },
  { id: 20, name: "Cass Brand",   gender: "F", hair: "red",    acc: "cigarette", outfit: "leather", age: 42, motive: "Eski patrondan öç almak" },
  { id: 21, name: "Roy Hex",      gender: "M", hair: "white",  acc: "hat",       outfit: "coat",    age: 67, motive: "Koleksiyonundaki eseri geri almak" },
  { id: 22, name: "Dot Vane",     gender: "F", hair: "gray",   acc: "none",      outfit: "uniform", age: 44, motive: "İç şikayeti engellemek" },
  { id: 23, name: "Marco Sly",    gender: "M", hair: "blonde", acc: "beard",     outfit: "trench",  age: 37, motive: "Rakibini devre dışı bırakmak" },
  { id: 24, name: "Eve Grant",    gender: "F", hair: "white",  acc: "glasses",   outfit: "suit",    age: 50, motive: "Şirketin kirli defterlerini gizlemek" },
];

export const HAIR_META = {
  black:  { color: "#1a1a1a",  label: "Siyah" },
  blonde: { color: "#D4A017",  label: "Sarı"  },
  red:    { color: "#B03010",  label: "Kızıl" },
  gray:   { color: "#888880",  label: "Gri"   },
  white:  { color: "#C8C8C0",  label: "Beyaz" },
};

export const ACC_LABELS = {
  hat:       "Şapka",
  glasses:   "Gözlük",
  mustache:  "Bıyık",
  cigarette: "Sigara",
  scar:      "Yara izi",
  earring:   "Küpe",
  beard:     "Sakal",
  none:      "—",
};

export const OUTFIT_LABELS = {
  dress:   "Elbise",
  suit:    "Takım",
  trench:  "Trençkot",
  coat:    "Palto",
  uniform: "Üniforma",
  vest:    "Yelek",
  leather: "Deri ceket",
};
