Handlebars = require('./lib/custom_handlebars.js').Handlebars
fs = require('fs')

log = (string)->
    fs.appendFileSync('/tmp/pybabel_hbs_extractor_log','-->'+string+'\n')

process.stdin.resume()
process.stdin.setEncoding('utf8')
process.stdin.on 'data', (chunk)->
    if chunk.indexOf('PYHBS COMMAND')==0
        parts=chunk.split(":")
        command=parts[1].trim()
        if command=='PARSE FILE'
            Extractor.init()
            Extractor.received_data = fs.readFileSync parts[2].trim(),
                encoding:'utf8'
            Extractor.flush()

Extractor =
    start:->
        @init()
        @communicate 'WAITING FOR COMMAND'

    init:->
        @received_data=""
        @output=[]

    communicate:(message)->
        process.stdout.write('PYHBS RESPONSE:'+message)

    flush:->
        @communicate 'SENDING OUTPUT'
        parsed_data = Handlebars.parse(@received_data)
        @extract parsed_data
        process.stdout.write(JSON.stringify(@output))
        @communicate 'OUTPUT END'

    extract: (node)->
        if node.body
            for statement in node.body
                @extract statement
        else if node.type == 'BlockStatement' and node.path.original == 'trans'
            content_node = node.program.body[0]
            @output.push
                line_number:content_node.first_line
                content:content_node.original
                funcname:'_'

        else if node.type == 'BlockStatement' and node.path.original == 'ntrans'
            content_node = node.program.body[0]
            alt_content_node = node.inverse.body[0]
            @output.push
                line_number:content_node.first_line
                alt_line_number:alt_content_node.first_line
                content:content_node.original
                alt_content:alt_content_node.original
                funcname:'ngettext'

        else if node.type == 'BlockStatement'
            @extract node.program
            if node.inverse
                @extract node.inverse
            return

        else if node.type == 'MustacheStatement'
            if node.path.original == '_'
                param = node.params[0]
                if param.type.toUpperCase()=='STRINGLITERAL'
                    @output.push
                        line_number:node.path.first_line
                        content:param.original
                        funcname:'_'

            else if node.path.original == 'n_'
                param = node.params[1]
                if param.type.toUpperCase()=='STRINGLITERAL'
                    @output.push
                        line_number:node.path.first_line
                        content:node.params[1].original
                        alt_content:node.params[2].original
                        funcname:'ngettext'


Extractor.start()