function messageCreator(sections = [], keyboard = []) {
  let message = "";

  sections.forEach((section, sectionIndex) => {
    // Добавляем заголовок секции
    if (section.title) {
      message += `${section.title}\n`;
    }

    // Добавляем элементы секции
    if (Array.isArray(section.items)) {
      section.items.forEach(item => {
        message += `${item}\n`;
      });
    }

    // Добавляем пустую строку между секциями, кроме последней
    if (sectionIndex < sections.length - 1) {
      message += "\n";
    }
  });

  return {
    text: message.trim(),
    options: {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      ...(keyboard.length > 0 ? { reply_markup: { inline_keyboard: keyboard } } : {})
    }
  };
}

module.exports = {
  messageCreator
};