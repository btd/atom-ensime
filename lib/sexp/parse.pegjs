start = SExps

SExps = S* first:SExp rest:(S+ a:SExp {return a;})* S* {
    rest.unshift(first);
    return rest;
}

S = [\r\n\t\v\f ]

SExp = Nil / DecimalLiteral / Symbol / String / List

String "string"
  = quotation_mark chars:char* quotation_mark { return chars.join(""); }

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }

escape         = "\\"
quotation_mark = '"'
unescaped      = [\x20-\x21\x23-\x5B\x5D-\u10FFFF]

DIGIT  = [0-9]
HEXDIG = [0-9a-f]i

List = '(' S* list:SExps S* ')' {
    return list;
}

Nil = 'nil' {
    return null;
} / '(' S* ')' {
    return null;
}

Symbol = (!"." start:SymbolStart parts:SymbolPart*) {
    return Symbol.for(start + parts.join(""));
}

SymbolStart = [a-z\-.\/_:*+=]i

SymbolPart = [a-z\-.\/_:*+=0-9]i

DecimalLiteral
  = parts:$(DecimalSign? DecimalIntegerLiteral "." DecimalDigits? ExponentPart?) { return parseFloat(parts); }
  / parts:$(DecimalSign? "." DecimalDigits ExponentPart?)     { return parseFloat(parts); }
  / parts:$(DecimalSign? DecimalIntegerLiteral ExponentPart?) { return parseInt(parts, 10); }

DecimalSign = [+-]

DecimalIntegerLiteral
  = "0" / NonZeroDigit DecimalDigits?

DecimalDigits
  = DecimalDigit+

DecimalDigit
  = [0-9]

NonZeroDigit
  = [1-9]

ExponentPart
  = ExponentIndicator SignedInteger

ExponentIndicator
  = [eE]

SignedInteger
  = [-+]? DecimalDigits
