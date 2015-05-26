{
  function unescape(c) {
  if(c === '\n' || c === ' ')  return '';
  else {
    switch(c) {
      case "\"": return "\"";
      case "a": return "\u0007";
      case "b": return "\b";
      case "t": return "\t";
      case "n": return "\n";
      case "v": return "\u0011";
      case "f": return "\f";
      case "r": return "\r";
      case "e": return "\u0027";
      case "s": return " ";
      case "d": return "\u0127";
      case "\\": return "\\";
    }
    return c;
  }
}

}

start = sexp

sexp = atom / list / cons / quoted

atom = nil / char / string / nan / number / symbol

nil =
  "nil" { return null; }
  / (left_brace right_brace) { return null; }

char = '?' c:normal_char {
  return c;
}

normal_char = !["\\] c:. {
  return c;
}

string = '"' c:character* '"' {
  return c.join('');
}

character = escaped_char / normal_char

escaped_char = "\\" c:. { return unescape(c); }

nan = "-1.0e+INF" { return -Infinity; }
      / "1.0e+INF" { return +Infinity }
      / ("-"? "0.0e+NaN") { return NaN }

number =
integer '.' digit* exp? {
  return parseFloat(text());
}
/ '.' digit+ exp? {
  return parseFloat(text());
}
/ integer exp? {
  return parseFloat(text());
}

symbol = (alpha / digit / symbol_special)+ (alpha / digit / symbol_special / ".")* "?"? {
  return Symbol.for(text());//'Symbol('+ text() + ')';
}

list = left_brace head:sexp tail:ws_sexp* right_brace {
  tail.unshift(head);
  return tail;
}

ws_sexp = ws s:sexp {
  return s;
}

cons = left_brace x:sexp ws "." ws y:sexp right_brace {
  return [x, y];
}

quoted = "'" s:sexp {
  return [Symbol.for("'"), s];
}

alpha = [a-zA-Z]
integer = "-"? ([1-9] digit*) / '0'
digit = [0-9]
exp = [eE] [+-]? digit+

symbol_special = [\+\-\*/_~!@$%^&=:<>{}]

left_brace = ws "(" ws
right_brace = ws ")" ws

ws = (comment / [ \n\r\t\f])*
comment = ";" (!"\n")* "\n"
