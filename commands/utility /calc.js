const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/utilityemoji");

module.exports = {
  name:             "calc",
  description:      "Calculate a math expression.",
  category:         "utility",
  aliases:          ["calculator", "math"],
  usage:            "<expression>",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("calc")
    .setDescription("Calculate a math expression.")
    .addStringOption(o =>
      o.setName("expression")
        .setDescription("Example: (12 + 8) / 4")
        .setRequired(true)
    )
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const expression = ctx.type === "prefix"
      ? ctx.args.join(" ").trim()
      : ctx.interaction.options.getString("expression").trim();

    if (!expression) {
      return reply(ctx, { embeds: [errorEmbed("Please provide an expression. Example: `!calc (12 + 8) / 4`")] });
    }

    let value;
    try {
      value = calculate(expression);
    } catch (err) {
      return reply(ctx, { embeds: [errorEmbed(err.message)] });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e.calculator} Calculator`)
      .addFields(
        { name: `${e.sparkle} Expression`, value: `\`\`\`${expression.slice(0, 900)}\`\`\`` },
        { name: `${e.result} Result`, value: `\`\`\`${formatNumber(value)}\`\`\`` },
      )
      .setFooter({
        text:    `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    return reply(ctx, { embeds: [embed] });
  },
};

function errorEmbed(message) {
  return new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle(`${e.warning} Calculator Error`)
    .setDescription(message);
}

function calculate(input) {
  const tokens = tokenize(input);
  const output = [];
  const operators = [];
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "^": 3 };
  const rightAssociative = new Set(["^"]);

  for (const token of tokens) {
    if (token.type === "number") {
      output.push(token);
      continue;
    }

    if (token.value === "(") {
      operators.push(token);
      continue;
    }

    if (token.value === ")") {
      while (operators.length && operators[operators.length - 1].value !== "(") output.push(operators.pop());
      if (!operators.length) throw new Error("Mismatched parentheses.");
      operators.pop();
      continue;
    }

    while (
      operators.length &&
      operators[operators.length - 1].value !== "(" &&
      (
        precedence[operators[operators.length - 1].value] > precedence[token.value] ||
        (precedence[operators[operators.length - 1].value] === precedence[token.value] && !rightAssociative.has(token.value))
      )
    ) {
      output.push(operators.pop());
    }

    operators.push(token);
  }

  while (operators.length) {
    const op = operators.pop();
    if (op.value === "(" || op.value === ")") throw new Error("Mismatched parentheses.");
    output.push(op);
  }

  const stack = [];
  for (const token of output) {
    if (token.type === "number") {
      stack.push(token.value);
      continue;
    }

    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) throw new Error("Invalid expression.");

    if (token.value === "+") stack.push(a + b);
    if (token.value === "-") stack.push(a - b);
    if (token.value === "*") stack.push(a * b);
    if (token.value === "/") {
      if (b === 0) throw new Error("Cannot divide by zero.");
      stack.push(a / b);
    }
    if (token.value === "%") {
      if (b === 0) throw new Error("Cannot modulo by zero.");
      stack.push(a % b);
    }
    if (token.value === "^") stack.push(a ** b);
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0])) throw new Error("Invalid or too large result.");
  return stack[0];
}

function tokenize(input) {
  const tokens = [];
  const normalized = input.replace(/×/g, "*").replace(/÷/g, "/");
  let i = 0;
  let expectingNumber = true;

  while (i < normalized.length) {
    const char = normalized[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(char) || (char === "-" && expectingNumber)) {
      let number = char;
      i++;
      while (i < normalized.length && /[0-9.]/.test(normalized[i])) {
        number += normalized[i];
        i++;
      }
      if (number === "-" || (number.match(/\./g) || []).length > 1) throw new Error("Invalid number in expression.");
      tokens.push({ type: "number", value: Number(number) });
      expectingNumber = false;
      continue;
    }

    if ("+-*/%^()".includes(char)) {
      tokens.push({ type: "operator", value: char });
      expectingNumber = char !== ")";
      i++;
      continue;
    }

    throw new Error("Only numbers, parentheses, and + - * / % ^ operators are supported.");
  }

  if (!tokens.length) throw new Error("Please provide an expression.");
  return tokens;
}

function formatNumber(value) {
  return Number.isInteger(value) ? value.toLocaleString() : Number(value.toFixed(10)).toLocaleString();
}