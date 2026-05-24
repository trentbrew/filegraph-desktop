/**
 * Expression evaluator for "when" clauses in keybindings
 * Supports: &&, ||, !, ==, !=, parentheses
 */

import type { KeybindingContext } from './types';

type Token =
  | { type: 'identifier'; value: string }
  | { type: 'operator'; value: '&&' | '||' | '!' | '==' | '!=' }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'literal'; value: string | boolean };

type ASTNode =
  | { type: 'binary'; operator: '&&' | '||' | '==' | '!='; left: ASTNode; right: ASTNode }
  | { type: 'unary'; operator: '!'; operand: ASTNode }
  | { type: 'identifier'; name: string }
  | { type: 'literal'; value: string | boolean };

/**
 * Evaluate a when clause expression
 */
export function evaluateExpression(
  expr: string,
  context: KeybindingContext
): boolean {
  if (!expr || expr.trim() === '') return true;

  try {
    const tokens = tokenize(expr);
    const ast = parse(tokens);
    return evaluate(ast, context);
  } catch (error) {
    console.error('Error evaluating expression:', expr, error);
    return false;
  }
}

/**
 * Tokenize an expression string
 */
function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Parentheses
    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      i++;
      continue;
    }

    // Two-character operators
    if (i < expr.length - 1) {
      const twoChar = expr.slice(i, i + 2);
      if (twoChar === '&&' || twoChar === '||' || twoChar === '==' || twoChar === '!=') {
        tokens.push({ type: 'operator', value: twoChar });
        i += 2;
        continue;
      }
    }

    // Single character operators
    if (char === '!') {
      tokens.push({ type: 'operator', value: '!' });
      i++;
      continue;
    }

    // String literals (quoted)
    if (char === '"' || char === "'") {
      const quote = char;
      let value = '';
      i++; // Skip opening quote
      
      while (i < expr.length && expr[i] !== quote) {
        value += expr[i];
        i++;
      }
      
      i++; // Skip closing quote
      tokens.push({ type: 'literal', value });
      continue;
    }

    // Boolean literals and identifiers
    if (/[a-zA-Z_]/.test(char)) {
      let value = '';
      
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        value += expr[i];
        i++;
      }

      if (value === 'true' || value === 'false') {
        tokens.push({ type: 'literal', value: value === 'true' });
      } else {
        tokens.push({ type: 'identifier', value });
      }
      continue;
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  return tokens;
}

/**
 * Parse tokens into an AST
 */
function parse(tokens: Token[]): ASTNode {
  let pos = 0;

  function peek(): Token | null {
    return tokens[pos] || null;
  }

  function consume(): Token {
    return tokens[pos++];
  }

  function parseExpression(): ASTNode {
    return parseOr();
  }

  function parseOr(): ASTNode {
    let left = parseAnd();

    while (peek()?.type === 'operator' && peek()?.value === '||') {
      consume(); // consume ||
      const right = parseAnd();
      left = { type: 'binary', operator: '||', left, right };
    }

    return left;
  }

  function parseAnd(): ASTNode {
    let left = parseEquality();

    while (peek()?.type === 'operator' && peek()?.value === '&&') {
      consume(); // consume &&
      const right = parseEquality();
      left = { type: 'binary', operator: '&&', left, right };
    }

    return left;
  }

  function parseEquality(): ASTNode {
    let left = parseUnary();

    const token = peek();
    if (token?.type === 'operator' && (token.value === '==' || token.value === '!=')) {
      const operator = consume().value as '==' | '!=';
      const right = parseUnary();
      return { type: 'binary', operator, left, right };
    }

    return left;
  }

  function parseUnary(): ASTNode {
    const token = peek();

    if (token?.type === 'operator' && token.value === '!') {
      consume(); // consume !
      const operand = parseUnary();
      return { type: 'unary', operator: '!', operand };
    }

    return parsePrimary();
  }

  function parsePrimary(): ASTNode {
    const token = consume();

    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    if (token.type === 'paren' && token.value === '(') {
      const expr = parseExpression();
      const closeParen = consume();
      
      if (closeParen?.type !== 'paren' || closeParen.value !== ')') {
        throw new Error('Expected closing parenthesis');
      }
      
      return expr;
    }

    if (token.type === 'identifier') {
      return { type: 'identifier', name: token.value };
    }

    if (token.type === 'literal') {
      return { type: 'literal', value: token.value };
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }

  return parseExpression();
}

/**
 * Evaluate an AST node
 */
function evaluate(node: ASTNode, context: KeybindingContext): boolean {
  switch (node.type) {
    case 'literal':
      return Boolean(node.value);

    case 'identifier': {
      const value = context[node.name as keyof KeybindingContext];
      return Boolean(value);
    }

    case 'unary': {
      const operandValue = evaluate(node.operand, context);
      return !operandValue;
    }

    case 'binary': {
      const left = evaluate(node.left, context);
      const right = evaluate(node.right, context);

      switch (node.operator) {
        case '&&':
          return left && right;
        case '||':
          return left || right;
        case '==':
          return left === right;
        case '!=':
          return left !== right;
      }
    }
  }
}
