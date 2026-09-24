export const personColor = (people, name) => people?.find(person => person.name === name)?.color;

export const personStyle = color => color ? { '--person-color': color } : undefined;
