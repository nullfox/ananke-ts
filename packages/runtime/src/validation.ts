import BaseJoi from '@hapi/joi';
import JoiDate from '@hapi/joi-date';

import {
  Parser,
} from 'acorn';

// Extended extendables
let ExtendedJoi = BaseJoi.extend(JoiDate);

// Const assignment to make eslint happy
const Joi = ExtendedJoi;

const fromString = (string: string): BaseJoi.Schema => {
  const ast = Parser.parse(
    string,
    {
      ecmaVersion: 2020,
    },
  );

  const parts = [];

  let current = ast.body[0];

  while (current) {
    if (current.type === 'ExpressionStatement') {
      current = current.expression;
    } else if (current.type === 'CallExpression') {
      const callee = current.callee;
      const object = callee.object;

      parts.unshift({
        fn: callee.property.name,
        args: current.arguments.map((arg: { [key: string]: any }) => arg.value),
      });

      if (object && object.type === 'Identifier') {
        parts.unshift({
          fn: object.name,
        });
      }

      current = object;
    } else if (current.type === 'MemberExpression') {
      const property = current.property;
      const object = current.object;

      parts.unshift({
        fn: property.name,
      });

      if (object && object.type === 'Identifier') {
        parts.unshift({
          fn: object.name,
        });
      }

      current = object;
    } else {
      current = false;
    }
  }

  return parts.reduce(
    (rule, part) => (
      rule[part.fn](...(part.args || []))
    ),
    Joi,
  );
};

export {
  fromString,

  Joi,
};
