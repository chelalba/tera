/* ---------------------------------------------------------------
   SHOP SETTINGS
   Edit the values below, then save. Nothing else needs changing.
   Items marked [CHANGE] are placeholders and must be replaced
   before you share the site with customers.
---------------------------------------------------------------- */

const SHOP = {
  name: 'Tera',
  kind: 'Home bakery',

  /* WhatsApp number in full international format.
     Digits only. No +, no spaces, no dashes.
     Algeria example: 213661234567
     France example:  33612345678            [CHANGE] */
  whatsapp: '213000000000',

  currency: 'DA',
  currencyBefore: false,

  phone: '+213 0 00 00 00 00',          /* [CHANGE] */
  email: 'orders@example.com',          /* [CHANGE] */
  instagram: '#',                       /* [CHANGE] paste your profile link */
  facebook: '#',                        /* [CHANGE] paste your page link */

  hours: 'Tuesday to Sunday, 9:00 to 19:00',
  notice: 'Layer cakes need 48 hours notice. Cookies and cupcakes are usually ready the same day.'
};

/* ---------------------------------------------------------------
   MENU
   category : cakes | pies | cookies | cupcakes
   illo     : cake | drip | pie | tart | cookie | cupcake
   tint     : colour of the drawing, so the cards do not repeat
   photo    : optional. Drop a real photo in assets/img/ and put
              its name here, for example 'assets/img/vanilla.jpg'.
              When photo is set the drawing is replaced by it.
---------------------------------------------------------------- */

const MENU = [
  {
    id: 'vanilla-bean',
    name: 'Vanilla bean layer cake',
    category: 'cakes',
    price: 3200,
    serves: 'Serves 8 to 10',
    desc: 'Three sponge layers, vanilla bean buttercream, a thin raspberry line between each layer.',
    illo: 'cake', tint: '#F0DCC2', photo: ''
  },
  {
    id: 'strawberry-cream',
    name: 'Strawberry cream cake',
    category: 'cakes',
    price: 3800,
    serves: 'Serves 10',
    desc: 'Chocolate sponge, whipped cream, fresh strawberries on top. Made the morning you collect it.',
    illo: 'cake', tint: '#E9C4B4', photo: ''
  },
  {
    id: 'dark-chocolate-drip',
    name: 'Dark chocolate drip',
    category: 'cakes',
    price: 3600,
    serves: 'Serves 10',
    desc: 'Dark chocolate sponge with ganache poured over the top edge. Not very sweet.',
    illo: 'drip', tint: '#C9A184', photo: ''
  },
  {
    id: 'honey-medovik',
    name: 'Honey cake',
    category: 'cakes',
    price: 3000,
    serves: 'Serves 8',
    desc: 'Eight thin honey layers with sour cream between them. Rests one night before it is sold.',
    illo: 'cake', tint: '#E3C08C', photo: ''
  },
  {
    id: 'pistachio-rose',
    name: 'Pistachio and rose',
    category: 'cakes',
    price: 4200,
    serves: 'Serves 10',
    desc: 'Ground pistachio sponge, rose water cream, crushed pistachio around the base.',
    illo: 'drip', tint: '#CFD5B4', photo: ''
  },
  {
    id: 'lemon-curd',
    name: 'Lemon curd cake',
    category: 'cakes',
    price: 3000,
    serves: 'Serves 8',
    desc: 'Lemon sponge with homemade curd and a light meringue on top.',
    illo: 'cake', tint: '#EFDFA8', photo: ''
  },
  {
    id: 'apple-cinnamon-pie',
    name: 'Apple cinnamon pie',
    category: 'pies',
    price: 2200,
    serves: 'Serves 8',
    desc: 'Butter pastry, apples cooked down with cinnamon, lattice top.',
    illo: 'pie', tint: '#E8C9A0', photo: ''
  },
  {
    id: 'pecan-tart',
    name: 'Pecan tart',
    category: 'pies',
    price: 2600,
    serves: 'Serves 8',
    desc: 'Short pastry shell filled with pecans and dark caramel.',
    illo: 'tart', tint: '#D6AE85', photo: ''
  },
  {
    id: 'brown-butter-cookies',
    name: 'Brown butter chocolate chip',
    category: 'cookies',
    price: 1200,
    serves: 'Box of 6',
    desc: 'Browned butter dough rested two days, dark chocolate, flaked salt on top.',
    illo: 'cookie', tint: '#D9B38C', photo: ''
  },
  {
    id: 'almond-crescents',
    name: 'Almond crescents',
    category: 'cookies',
    price: 1400,
    serves: 'Box of 12',
    desc: 'Short almond dough rolled in icing sugar while still warm.',
    illo: 'cookie', tint: '#EBD9BE', photo: ''
  },
  {
    id: 'vanilla-cupcakes',
    name: 'Vanilla buttercream cupcakes',
    category: 'cupcakes',
    price: 1600,
    serves: 'Box of 6',
    desc: 'Vanilla sponge with a swirl of buttercream. Tell us the colour you want.',
    illo: 'cupcake', tint: '#F1D9C8', photo: ''
  },
  {
    id: 'red-velvet-cupcakes',
    name: 'Red velvet cupcakes',
    category: 'cupcakes',
    price: 1800,
    serves: 'Box of 6',
    desc: 'Cocoa sponge with cream cheese frosting and a crumb of sponge on top.',
    illo: 'cupcake', tint: '#DCA898', photo: ''
  }
];

const CATEGORIES = [
  { id: 'all',      label: 'All' },
  { id: 'cakes',    label: 'Cakes' },
  { id: 'pies',     label: 'Pies' },
  { id: 'cookies',  label: 'Cookies' },
  { id: 'cupcakes', label: 'Cupcakes' }
];
