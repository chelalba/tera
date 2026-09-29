/* ---------------------------------------------------------------
   LANGUAGES

   Every word the shop page shows, in English and Arabic. Choosing
   Arabic also flips the whole page to right to left.

   The menu items are not here. Their Arabic lives with the item in
   the database, so the shop can change a name without touching code.
---------------------------------------------------------------- */

const TeraI18n = (function () {
  'use strict';

  const KEY = 'tera:lang';

  const TEXT = {
    en: {
      dir: 'ltr',
      htmlLang: 'en',
      switchTo: 'العربية',
      switchLabel: 'Switch to Arabic',

      'skip': 'Skip to the menu',
      'nav.menu': 'Menu',
      'nav.how': 'How to order',
      'nav.notes': 'Notes',
      'nav.contact': 'Contact',
      'nav.basket': 'Your basket',
      'nav.open': 'Menu',

      'hero.eyebrow': 'Layers of happiness',
      'hero.title': 'Tiramisu made the day you collect it.',
      'hero.lead': 'Pick what you want from the menu, put it in your basket, and send the order straight to us on WhatsApp. We reply with a time to collect it.',
      'hero.seeMenu': 'See the menu',
      'hero.howWorks': 'How ordering works',
      'hero.whatsapp': 'Orders are taken on WhatsApp',

      'menu.title': 'Menu',
      'menu.sub': 'Prices are for the whole cake or the whole box. Tap the stars to say what you thought of something you have tried.',
      'menu.everything': 'Everything',
      'menu.empty': 'Nothing in this part of the menu yet.',
      'menu.filterLabel': 'Filter the menu',
      'menu.sortLabel': 'Sort the menu',
      'sort.default': 'Sort by',
      'sort.rating': 'Best rated',
      'sort.priceAsc': 'Price, low to high',
      'sort.priceDesc': 'Price, high to low',
      'sort.name': 'Name, A to Z',

      'card.add': 'Add',
      'card.notRated': 'Not rated yet',
      'card.rate': 'Rate {n} out of 5',
      'card.rateGroup': 'Rate this',

      'how.title': 'How to order',
      'how.1.title': 'Fill your basket',
      'how.1.body': 'Add what you want from the menu. You can change the quantity in the basket at any time.',
      'how.2.title': 'Leave your details',
      'how.2.body': 'Your name, your phone number, and the day you want to collect the order.',
      'how.3.title': 'Send it on WhatsApp',
      'how.3.body': 'The button writes the whole order into a message. You press send, we reply to confirm.',

      'notes.title': 'Notes from the counter',
      'notes.sub': 'Tell us how it went, or ask for something that is not on the menu.',
      'notes.name': 'Your name',
      'notes.text': 'Your note',
      'notes.send': 'Leave the note',
      'notes.empty': 'No notes yet. Yours would be the first one.',
      'notes.saved': 'Thank you, your note is saved.',
      'notes.needName': 'Please write your name.',
      'notes.needText': 'Please write your note first.',
      'notes.failed': 'The note did not save. ',

      'contact.title': 'Get in touch',
      'contact.whatsapp': 'WhatsApp',
      'contact.openChat': 'Open a chat with us',
      'contact.phone': 'Phone',
      'contact.email': 'Email',
      'contact.open': 'Open',

      'basket.title': 'Your basket',
      'basket.close': 'Close the basket',
      'basket.empty': 'Your basket is empty. Add something from the menu.',
      'basket.remove': 'Remove',
      'basket.less': 'One less {name}',
      'basket.more': 'One more {name}',
      'basket.details': 'Your details',
      'basket.name': 'Name',
      'basket.phone': 'Phone number',
      'basket.date': 'Day you want it',
      'basket.mode': 'Collection or delivery',
      'basket.collection': 'Collection',
      'basket.delivery': 'Delivery',
      'basket.note': 'Anything to add',
      'basket.optional': 'optional',
      'basket.notePlaceholder': 'Writing on the cake, allergies, a colour you want',
      'basket.total': 'Total',
      'basket.confirm': 'Confirm on WhatsApp',
      'basket.confirmNote': 'This opens WhatsApp with your order already written out. Nothing is sent until you press send there.',

      'order.needName': 'Please write your name.',
      'order.needPhone': 'Please write a phone number we can reach you on.',
      'order.needDate': 'Please pick the day you want your order.',
      'order.notReady': 'Ordering is not switched on yet. Please call us and we will take it by phone.',
      'order.failed': 'The order could not be saved. ',
      'order.ready': 'Your order {ref} is ready in WhatsApp. Press send there.',

      'toast.added': '{name} is in your basket.',
      'toast.removed': 'Removed from your basket.',
      'toast.rated': 'Thank you, your rating is saved.',
      'toast.rateFailed': 'Your rating did not save. Check your connection.',
      'toast.menuUpdated': 'The menu has just been updated.',

      'error.title': 'The menu is not loading',
      'error.body': 'Something is wrong at our end. Please try again in a moment, or send us a message and we will take your order there.',

      'footer.privacy': 'Privacy',
      'footer.terms': 'Terms',

      'code.star': 'Shop owner',
      'code.title': 'Enter the code',
      'code.label': 'Code',
      'code.open': 'Open',
      'code.cancel': 'Cancel',
      'code.wrong': 'That code is not right.',

      'wa.hello': 'Hello {shop}, I would like to order.',
      'wa.total': 'Total',
      'wa.name': 'Name',
      'wa.phone': 'Phone',
      'wa.note': 'Note',
      'wa.ref': 'Order ref',
      'wa.times': 'x'
    },

    ar: {
      dir: 'rtl',
      htmlLang: 'ar',
      switchTo: 'English',
      switchLabel: 'التبديل إلى الإنجليزية',

      'skip': 'انتقل إلى القائمة',
      'nav.menu': 'القائمة',
      'nav.how': 'كيف تطلب',
      'nav.notes': 'آراء الزبائن',
      'nav.contact': 'تواصل معنا',
      'nav.basket': 'سلتك',
      'nav.open': 'القائمة',

      'hero.eyebrow': 'طبقات من السعادة',
      'hero.title': 'تيراميسو يُحضَّر يوم استلامك له.',
      'hero.lead': 'اختر ما تريد من القائمة، ضعه في سلتك، وأرسل الطلب إلينا مباشرة عبر واتساب. نرد عليك بموعد الاستلام.',
      'hero.seeMenu': 'تصفح القائمة',
      'hero.howWorks': 'طريقة الطلب',
      'hero.whatsapp': 'نستقبل الطلبات عبر واتساب',

      'menu.title': 'القائمة',
      'menu.sub': 'كل الأسعار مذكورة. اضغط على النجوم لتخبرنا برأيك فيما جربته.',
      'menu.everything': 'كل الأصناف',
      'menu.empty': 'لا يوجد شيء في هذا القسم بعد.',
      'menu.filterLabel': 'تصفية القائمة',
      'menu.sortLabel': 'ترتيب القائمة',
      'sort.default': 'ترتيب حسب',
      'sort.rating': 'الأعلى تقييماً',
      'sort.priceAsc': 'السعر من الأقل إلى الأعلى',
      'sort.priceDesc': 'السعر من الأعلى إلى الأقل',
      'sort.name': 'الاسم أبجدياً',

      'card.add': 'أضف',
      'card.notRated': 'لا يوجد تقييم بعد',
      'card.rate': 'قيّم بـ {n} من 5',
      'card.rateGroup': 'قيّم هذا الصنف',

      'how.title': 'كيف تطلب',
      'how.1.title': 'املأ سلتك',
      'how.1.body': 'أضف ما تريد من القائمة. يمكنك تغيير الكمية في السلة في أي وقت.',
      'how.2.title': 'اترك معلوماتك',
      'how.2.body': 'اسمك، رقم هاتفك، واليوم الذي تريد استلام الطلب فيه.',
      'how.3.title': 'أرسله عبر واتساب',
      'how.3.body': 'الزر يكتب الطلب كاملاً في رسالة. تضغط إرسال، ونرد عليك للتأكيد.',

      'notes.title': 'آراء الزبائن',
      'notes.sub': 'أخبرنا كيف كان الطلب، أو اطلب شيئاً غير موجود في القائمة.',
      'notes.name': 'اسمك',
      'notes.text': 'رسالتك',
      'notes.send': 'أرسل رسالتك',
      'notes.empty': 'لا توجد رسائل بعد. كن أول من يكتب.',
      'notes.saved': 'شكراً لك، تم حفظ رسالتك.',
      'notes.needName': 'الرجاء كتابة اسمك.',
      'notes.needText': 'الرجاء كتابة رسالتك أولاً.',
      'notes.failed': 'لم يتم حفظ الرسالة. ',

      'contact.title': 'تواصل معنا',
      'contact.whatsapp': 'واتساب',
      'contact.openChat': 'افتح محادثة معنا',
      'contact.phone': 'الهاتف',
      'contact.email': 'البريد الإلكتروني',
      'contact.open': 'أوقات العمل',

      'basket.title': 'سلتك',
      'basket.close': 'إغلاق السلة',
      'basket.empty': 'سلتك فارغة. أضف شيئاً من القائمة.',
      'basket.remove': 'حذف',
      'basket.less': 'واحد أقل من {name}',
      'basket.more': 'واحد أكثر من {name}',
      'basket.details': 'معلوماتك',
      'basket.name': 'الاسم',
      'basket.phone': 'رقم الهاتف',
      'basket.date': 'يوم الاستلام',
      'basket.mode': 'استلام أم توصيل',
      'basket.collection': 'استلام',
      'basket.delivery': 'توصيل',
      'basket.note': 'ملاحظة إضافية',
      'basket.optional': 'اختياري',
      'basket.notePlaceholder': 'كتابة على الكعكة، حساسية، لون معين',
      'basket.total': 'المجموع',
      'basket.confirm': 'أكّد الطلب عبر واتساب',
      'basket.confirmNote': 'سيفتح واتساب والطلب مكتوب بالفعل. لا يُرسل شيء حتى تضغط إرسال هناك.',

      'order.needName': 'الرجاء كتابة اسمك.',
      'order.needPhone': 'الرجاء كتابة رقم هاتف نتواصل معك عليه.',
      'order.needDate': 'الرجاء اختيار يوم الاستلام.',
      'order.notReady': 'الطلب عبر الموقع غير مفعّل بعد. الرجاء الاتصال بنا وسنأخذ طلبك هاتفياً.',
      'order.failed': 'تعذّر حفظ الطلب. ',
      'order.ready': 'طلبك {ref} جاهز في واتساب. اضغط إرسال هناك.',

      'toast.added': 'تمت إضافة {name} إلى سلتك.',
      'toast.removed': 'تم الحذف من سلتك.',
      'toast.rated': 'شكراً لك، تم حفظ تقييمك.',
      'toast.rateFailed': 'لم يُحفظ التقييم. تحقق من اتصالك.',
      'toast.menuUpdated': 'تم تحديث القائمة للتو.',

      'error.title': 'تعذّر تحميل القائمة',
      'error.body': 'هناك خلل من جهتنا. الرجاء المحاولة بعد قليل، أو راسلنا وسنأخذ طلبك مباشرة.',

      'footer.privacy': 'الخصوصية',
      'footer.terms': 'الشروط',

      'code.star': 'صاحب المحل',
      'code.title': 'أدخل الرمز',
      'code.label': 'الرمز',
      'code.open': 'دخول',
      'code.cancel': 'إلغاء',
      'code.wrong': 'الرمز غير صحيح.',

      'wa.hello': 'مرحباً {shop}، أود أن أطلب.',
      'wa.total': 'المجموع',
      'wa.name': 'الاسم',
      'wa.phone': 'الهاتف',
      'wa.note': 'ملاحظة',
      'wa.ref': 'رقم الطلب',
      'wa.times': '×'
    }
  };

  let current = 'en';

  function read() {
    try { return localStorage.getItem(KEY); } catch (err) { return null; }
  }

  function remember(lang) {
    try { localStorage.setItem(KEY, lang); } catch (err) { /* private window */ }
  }

  /* what the visitor picked last time, else Arabic when the browser
     itself is Arabic, else English */
  function start() {
    const saved = read();
    if (saved === 'ar' || saved === 'en') { current = saved; return current; }
    const browser = (navigator.language || '').toLowerCase();
    current = browser.indexOf('ar') === 0 ? 'ar' : 'en';
    return current;
  }

  function set(lang) {
    current = (lang === 'ar') ? 'ar' : 'en';
    remember(current);
    return current;
  }

  function lang() { return current; }
  function isArabic() { return current === 'ar'; }

  /* t('toast.added', { name: 'Tiramisu' }) */
  function t(key, vars) {
    const table = TEXT[current] || TEXT.en;
    let out = table[key];
    if (out === undefined) out = TEXT.en[key];
    if (out === undefined) return key;
    if (vars) {
      Object.keys(vars).forEach(k => {
        out = out.split('{' + k + '}').join(vars[k]);
      });
    }
    return out;
  }

  function meta(key) {
    const table = TEXT[current] || TEXT.en;
    return table[key];
  }

  /* the Arabic of a menu item, falling back to the English when the
     shop has not written one yet */
  function item(obj, field) {
    if (current === 'ar') {
      const arabic = obj[field + '_ar'];
      if (arabic) return arabic;
    }
    return obj[field] || '';
  }

  return { start, set, lang, isArabic, t, meta, item, TEXT };
})();
