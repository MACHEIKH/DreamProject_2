/*global rJS, RSVP, jQuery, Handlebars,
  promiseEventListener, initGadgetMixin*/
/*jslint nomen: true */
(function (window, rJS, RSVP, Handlebars, initGadgetMixin) {
  "use strict";

  /////////////////////////////////////////////////////////////////
  // Handlebars
  /////////////////////////////////////////////////////////////////
  // Precompile the templates while loading the first gadget instance
  var gadget_klass = rJS(window),
    source = gadget_klass.__template_element
                         .getElementById("label-template")
                         .innerHTML,
    label_template = Handlebars.compile(source);

  initGadgetMixin(gadget_klass);
  gadget_klass

    .declareMethod("render", function (property_list, data) {
      var gadget = this,
        queue,
        value,
        property;

      gadget.props.field_gadget_list = [];
      function addField(property, value) {
        var sub_gadget;
        queue
          .push(function () {
            gadget.props.element.insertAdjacentHTML(
              'beforeend',
              label_template({
                "for": property.id,
                "name": (property.name || property.id)
              })
            );
            if (property.type === "number") {
              return gadget.declareGadget("../number_field/index.html");
            }
            if (property.choice) {
              return gadget.declareGadget("../list_field/index.html");
            }
            return gadget.declareGadget("../string_field/index.html");
          })
          .push(function (gg) {
            var choice = property.choice || [],
              default_opt = choice[0] ? [choice[0][1]] : [""];
            sub_gadget = gg;
            value = (data[property.id] === undefined ?
                      value : data[property.id]);
            return sub_gadget.render({field_json: {
              title: (property.description || ''),
              key: property.id,
              value: value,
              items: choice,
              default: default_opt
            }});
          })
          .push(function () {
            return sub_gadget.getElement();
          })
          .push(function (sub_element) {
            gadget.props.element.appendChild(sub_element);
            gadget.props.field_gadget_list.push(sub_gadget);
          });
      }

      queue = new RSVP.Queue()
        .push(function () {
          Object.keys(property_list).forEach(function (i) {
            property = property_list[i];
            if (property._class === "Dream.Property") {
              value = property._default || "";
              addField(property, value);
            }
          });
        });

      return queue;
    })

    // getContent of all subfields
    .declareMethod("getContent", function () {
      var i, promise_list = [];
      for (i = 0; i < this.props.field_gadget_list.length; i += 1) {
        promise_list.push(this.props.field_gadget_list[i].getContent());
      }
      return RSVP.Queue()
        .push(function () { return RSVP.all(promise_list); })
        .push(function (result_list) {
          var name, result = {};
          for (i = 0; i < result_list.length; i += 1) {
            for (name in result_list[i]) {
              if (result_list[i].hasOwnProperty(name)) {
                result[name] = result_list[i][name];
              }
            }
          }
          return result;
        });
    });


}(window, rJS, RSVP, Handlebars, initGadgetMixin));