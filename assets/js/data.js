/* ---------------------------------------------------------------
   SHOP SETTINGS
---------------------------------------------------------------- */

const SHOP = {
  name: 'TiraMood',
  kind: 'Tiramisu and cakes',
  kind_ar: 'تيراميسو وحلويات',

  /* full international number, digits only, no + and no spaces */
  whatsapp: '213558529207',

  currency: 'DA',
  currency_ar: 'دج',
  currencyBefore: false,

  phone: '+213 558 52 92 07',
  email: 'tiramood39@gmail.com',
  instagram: 'https://instagram.com/tira.mood39',
  facebook: 'https://facebook.com/tiramood',

  /* The code behind the star at the end of the header. It only hides
     the door, it does not lock it: anyone reading the page can find
     it. Set OWNER_PASSWORD on the server for a real lock, and make it
     the same as this so one code does both. */
  ownerCode: '1212',

  hours: 'Every day except Friday',
  hours_ar: 'كل يوم من غير الجمعة'

};

/* ---------------------------------------------------------------
   THE MENU
   photo    : a picture in assets/img. When set it replaces the drawing.
   illo     : the drawing used when there is no photo.
              cake | drip | pie | tart | cookie | cupcake
   *_ar     : the Arabic the shop page shows when Arabic is chosen.
              Leave one empty and the English is shown instead.
---------------------------------------------------------------- */

const MENU = [
  {
    id: 'classic-tiramisu',
    name: 'Classic tiramisu',
    name_ar: 'تيراميسو كلاسيك',
    category: 'tiramisu',
    price: 1400,
    serves: 'Serves 2',
    serves_ar: 'يكفي شخصين',
    desc: 'Mascarpone cream, coffee soaked biscuits, cocoa dusted on top the moment it leaves the fridge.',
    desc_ar: 'كريمة الماسكاربوني وبسكويت مغموس في القهوة، مع رشة كاكاو توضع لحظة خروجه من الثلاجة.',
    illo: 'cake', tint: '#e3c08c',
    photo: '/assets/img/tiramisu.jpg'
  },
  {
    id: 'tiramisu-cake',
    name: 'Tiramisu celebration cake',
    name_ar: 'كعكة تيراميسو للمناسبات',
    category: 'tiramisu',
    price: 3800,
    serves: 'Serves 10',
    serves_ar: 'تكفي 10 أشخاص',
    desc: 'A round tiramisu ringed with ladyfingers, finished with cocoa and a ribbon. We write the name you want on top.',
    desc_ar: 'تيراميسو دائري محاط بأصابع السيدات، مغطى بالكاكاو ومزين بشريطة. نكتب الاسم الذي تريده فوقها.',
    illo: 'cake', tint: '#d9b38c',
    photo: '/assets/img/tiramisu-cake.jpg'
  },
  {
    id: 'dark-chocolate-drip',
    name: 'Dark chocolate cake',
    name_ar: 'كعكة الشوكولاتة الداكنة',
    category: 'cakes',
    price: 3600,
    serves: 'Serves 10',
    serves_ar: 'تكفي 10 أشخاص',
    desc: 'Dark chocolate sponge under a thick ganache. Not very sweet.',
    desc_ar: 'إسفنج الشوكولاتة الداكنة تحت طبقة غاناش سميكة. ليست شديدة الحلاوة.',
    illo: 'drip', tint: '#c9a184',
    photo: '/assets/img/chocolate-cake.jpg'
  },
  {
    id: 'vanilla-bean',
    name: 'Vanilla flower cake',
    name_ar: 'كعكة الفانيلا بالورود',
    category: 'cakes',
    price: 2200,
    serves: 'Serves 2 to 3',
    serves_ar: 'تكفي شخصين إلى ثلاثة',
    desc: 'A small vanilla cake under smooth buttercream, with flowers piped by hand. Boxed to carry.',
    desc_ar: 'كعكة فانيلا صغيرة مغطاة بكريمة الزبدة الناعمة، مع ورود مرسومة باليد. تُقدَّم في علبة.',
    illo: 'cake', tint: '#f0dcc2',
    photo: '/assets/img/flower-cake.jpg'
  },
  {
    id: 'walnut-baklava',
    name: 'Walnut baklava',
    name_ar: 'بقلاوة بالجوز',
    category: 'pies',
    price: 2400,
    serves: 'Box of 12',
    serves_ar: 'علبة 12 قطعة',
    desc: 'Layers of filo and ground walnut, syrup poured over while the tray is still warm.',
    desc_ar: 'طبقات من عجين الفيلو والجوز المطحون، يُسكب عليها القطر والصينية ما زالت دافئة.',
    illo: 'tart', tint: '#e8c9a0',
    photo: '/assets/img/baklava.jpg'
  },
  {
    id: 'strawberry-cream',
    name: 'Strawberry cream cake',
    name_ar: 'كعكة الفراولة بالكريمة',
    category: 'cakes',
    price: 3800,
    serves: 'Serves 10',
    serves_ar: 'تكفي 10 أشخاص',
    desc: 'Chocolate sponge, whipped cream, fresh strawberries on top. Made the morning you collect it.',
    desc_ar: 'إسفنج الشوكولاتة مع كريمة مخفوقة وفراولة طازجة فوقها. تُحضَّر صباح يوم الاستلام.',
    illo: 'cake', tint: '#e9c4b4', photo: ''
  },
  {
    id: 'honey-medovik',
    name: 'Honey cake',
    name_ar: 'كعكة العسل',
    category: 'cakes',
    price: 3000,
    serves: 'Serves 8',
    serves_ar: 'تكفي 8 أشخاص',
    desc: 'Eight thin honey layers with sour cream between them. Rests one night before it is sold.',
    desc_ar: 'ثماني طبقات رقيقة بالعسل بينها كريمة حامضة. ترتاح ليلة كاملة قبل البيع.',
    illo: 'cake', tint: '#e3c08c', photo: ''
  },
  {
    id: 'pistachio-rose',
    name: 'Pistachio and rose',
    name_ar: 'الفستق وماء الورد',
    category: 'cakes',
    price: 4200,
    serves: 'Serves 10',
    serves_ar: 'تكفي 10 أشخاص',
    desc: 'Ground pistachio sponge, rose water cream, crushed pistachio around the base.',
    desc_ar: 'إسفنج بالفستق المطحون، كريمة بماء الورد، وفستق مجروش حول القاعدة.',
    illo: 'drip', tint: '#cfd5b4', photo: ''
  },
  {
    id: 'lemon-curd',
    name: 'Lemon curd cake',
    name_ar: 'كعكة كريمة الليمون',
    category: 'cakes',
    price: 3000,
    serves: 'Serves 8',
    serves_ar: 'تكفي 8 أشخاص',
    desc: 'Lemon sponge with homemade curd and a light meringue on top.',
    desc_ar: 'إسفنج الليمون مع كريمة ليمون منزلية ومرنغ خفيف فوقها.',
    illo: 'cake', tint: '#efdfa8', photo: ''
  },
  {
    id: 'apple-cinnamon-pie',
    name: 'Apple cinnamon pie',
    name_ar: 'فطيرة التفاح بالقرفة',
    category: 'pies',
    price: 2200,
    serves: 'Serves 8',
    serves_ar: 'تكفي 8 أشخاص',
    desc: 'Butter pastry, apples cooked down with cinnamon, lattice top.',
    desc_ar: 'عجين بالزبدة وتفاح مطهو مع القرفة، بوجه مضفور.',
    illo: 'pie', tint: '#e8c9a0', photo: ''
  },
  {
    id: 'pecan-tart',
    name: 'Pecan tart',
    name_ar: 'تارت البيكان',
    category: 'pies',
    price: 2600,
    serves: 'Serves 8',
    serves_ar: 'تكفي 8 أشخاص',
    desc: 'Short pastry shell filled with pecans and dark caramel.',
    desc_ar: 'قاعدة عجين هشة محشوة بالبيكان والكراميل الداكن.',
    illo: 'tart', tint: '#d6ae85', photo: ''
  },
  {
    id: 'brown-butter-cookies',
    name: 'Brown butter chocolate chip',
    name_ar: 'بسكويت الزبدة البنية بالشوكولاتة',
    category: 'cookies',
    price: 1200,
    serves: 'Box of 6',
    serves_ar: 'علبة 6 قطع',
    desc: 'Browned butter dough rested two days, dark chocolate, flaked salt on top.',
    desc_ar: 'عجين بالزبدة البنية يرتاح يومين، مع شوكولاتة داكنة ورشة ملح خشن.',
    illo: 'cookie', tint: '#d9b38c', photo: ''
  },
  {
    id: 'almond-crescents',
    name: 'Almond crescents',
    name_ar: 'هلالات اللوز',
    category: 'cookies',
    price: 1400,
    serves: 'Box of 12',
    serves_ar: 'علبة 12 قطعة',
    desc: 'Short almond dough rolled in icing sugar while still warm.',
    desc_ar: 'عجين لوز هش يُغمَّس في السكر الناعم وهو ما زال دافئاً.',
    illo: 'cookie', tint: '#ebd9be', photo: ''
  },
  {
    id: 'vanilla-cupcakes',
    name: 'Vanilla buttercream cupcakes',
    name_ar: 'كب كيك الفانيلا بكريمة الزبدة',
    category: 'cupcakes',
    price: 1600,
    serves: 'Box of 6',
    serves_ar: 'علبة 6 قطع',
    desc: 'Vanilla sponge with a swirl of buttercream. Tell us the colour you want.',
    desc_ar: 'إسفنج الفانيلا مع دوامة من كريمة الزبدة. أخبرنا باللون الذي تريده.',
    illo: 'cupcake', tint: '#f1d9c8', photo: ''
  },
  {
    id: 'red-velvet-cupcakes',
    name: 'Red velvet cupcakes',
    name_ar: 'كب كيك ريد فيلفيت',
    category: 'cupcakes',
    price: 1800,
    serves: 'Box of 6',
    serves_ar: 'علبة 6 قطع',
    desc: 'Cocoa sponge with cream cheese frosting and a crumb of sponge on top.',
    desc_ar: 'إسفنج الكاكاو مع كريمة الجبن وفتات الإسفنج فوقها.',
    illo: 'cupcake', tint: '#dca898', photo: ''
  }
];

const CATEGORIES = [
  { id: 'all',      label: 'All',      label_ar: 'الكل' },
  { id: 'tiramisu', label: 'Tiramisu', label_ar: 'تيراميسو' },
  { id: 'cakes',    label: 'Cakes',    label_ar: 'كعك' },
  { id: 'pies',     label: 'Pies',     label_ar: 'فطائر' },
  { id: 'cookies',  label: 'Cookies',  label_ar: 'بسكويت' },
  { id: 'cupcakes', label: 'Cupcakes', label_ar: 'كب كيك' }
];

/* The browser reads the three names above as globals. The server needs
   them too, and requiring this file is safer than reading it off disk
   once it is running somewhere like Vercel. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SHOP, CATEGORIES, MENU };
}
