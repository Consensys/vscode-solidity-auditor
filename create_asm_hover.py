#! /usr/bin/env python3
# -*- coding: utf-8 -*-
# Author : <github.com/tintinweb>
import evmdasm

template = {
        "prefix": "pragma",
        "body": "{{ $1 }}",
        "description": "Info:\n$1 tes {{ tes test}} test  *test* \"test\"",
        "example": "{% pragma ${name} %}",
        "security": "do not use experimental features!"
    }

def main():
    hover_asm = {}

    for instr in evmdasm.registry.INSTRUCTIONS:
        name = instr.name.lower()
        if name.startswith("unofficial_"):
            continue
        hover_asm[name] = {
                            "prefix":name,
                            #"body":None,
                            "description":instr.description,
                            #"example":None,
                            #"security":None,
                            "instr_opcode":instr.opcode,
                            "instr_gas": instr.gas,
                            #"instr_args": ["(%s) %s"%(a._type, a) for a in instr.args],
                            "instr_args": ["%s"%(a) for a in instr.args],
                            "instr_returns": ["%s"%(a) for a in instr.returns],
                            "instr_category": instr.category,
                            "instr_size": instr.size,
                            "instr_pops": instr.pops,
                            "instr_pushes": instr.pushes,
                            "instr_fork": instr.fork
                            }
    import json
    print(json.dumps(hover_asm, sort_keys=True, indent=4, separators=(',', ': ')))

if __name__ == "__main__":
    main()
