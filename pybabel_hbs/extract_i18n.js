// Generated by CoffeeScript 1.12.4
(function() {
  var Extractor, Handlebars, fs, log;

  Handlebars = require('./lib/custom_handlebars.js').Handlebars;

  fs = require('fs');

  log = function(string) {
    return fs.appendFileSync('/tmp/pybabel_hbs_extractor_log', '-->' + string + '\n');
  };

  process.stdin.resume();

  process.stdin.setEncoding('utf8');

  process.stdin.on('data', function(chunk) {
    var command, parts;
    if (chunk.indexOf('PYHBS COMMAND') === 0) {
      parts = chunk.split(":");
      command = parts[1].trim();
      if (command === 'PARSE FILE') {
        Extractor.init();
        Extractor.received_data = fs.readFileSync(parts[2].trim(), {
          encoding: 'utf8'
        });
        return Extractor.flush();
      }
    }
  });

  Extractor = {
    start: function() {
      this.init();
      return this.communicate('WAITING FOR COMMAND');
    },
    init: function() {
      this.received_data = "";
      return this.output = [];
    },
    communicate: function(message) {
      return process.stdout.write('PYHBS RESPONSE:' + message);
    },
    flush: function() {
      var parsed_data;
      this.communicate('SENDING OUTPUT');
      parsed_data = Handlebars.parse(this.received_data);
      this.extract(parsed_data);
      process.stdout.write(JSON.stringify(this.output));
      return this.communicate('OUTPUT END');
    },
    extract: function(node) {
      var alt_content_node, content_node, i, len, param, ref, results, statement;
      if (node.body) {
        ref = node.body;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          statement = ref[i];
          results.push(this.extract(statement));
        }
        return results;
      } else if (node.type === 'BlockStatement' && node.path.original === 'trans') {
        content_node = node.program.body[0];
        return this.output.push({
          line_number: content_node.first_line,
          content: content_node.original,
          funcname: '_'
        });
      } else if (node.type === 'BlockStatement' && node.path.original === 'ntrans') {
        content_node = node.program.body[0];
        alt_content_node = node.inverse.body[0];
        return this.output.push({
          line_number: content_node.first_line,
          alt_line_number: alt_content_node.first_line,
          content: content_node.original,
          alt_content: alt_content_node.original,
          funcname: 'ngettext'
        });
      } else if (node.type === 'BlockStatement') {
        this.extract(node.program);
        if (node.inverse) {
          this.extract(node.inverse);
        }
      } else if (node.type === 'MustacheStatement') {
        if (node.path.original === '_') {
          param = node.params[0];
          if (param.type.toUpperCase() === 'STRINGLITERAL') {
            return this.output.push({
              line_number: node.path.first_line,
              content: param.original,
              funcname: '_'
            });
          }
        } else if (node.path.original === 'n_') {
          param = node.params[1];
          if (param.type.toUpperCase() === 'STRINGLITERAL') {
            return this.output.push({
              line_number: node.path.first_line,
              content: node.params[1].original,
              alt_content: node.params[2].original,
              funcname: 'ngettext'
            });
          }
        }
      }
    }
  };

  Extractor.start();

}).call(this);
