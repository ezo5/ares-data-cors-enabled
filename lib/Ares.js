(function() {
  var Ares, FakePromise, Validators, XmlParser, http, isWindow;

  Validators = require('./Validators');

  FakePromise = require('./FakePromise');

  XmlParser = require('xml-parser');
  
  Window = require('window');
  
  http = require('browser-http');
  
  window = new Window();
  
  isWindow = typeof window !== 'undefined';

  Ares = (function() {
    Ares.URL = 'https://upomento.firebaseapp.com:8383/http://wwwinfo.mfcr.cz/cgi-bin/ares/darv_std.cgi';

    Ares.prototype.http = http;

    Ares.prototype.url = null;

    Ares.prototype.onlyActive = true;

    Ares.prototype.encoding = 'utf';

    Ares.prototype.lastOriginalData = null;

    function Ares(url) {
      this.url = url != null ? url : Ares.URL;
    }

    Ares.prototype.find = function(name, value, fn, limit, type) {
      var options;
      if (limit == null) {
        limit = 10;
      }
      if (type == null) {
        type = 'free';
      }
      options = {
        czk: this.encoding,
        aktivni: this.onlyActive,
        max_pocet: limit,
        typ_vyhledani: type
      };
      options[name] = value;
      if (limit === false) {
        delete options.max_pocet;
      }
      this.http.get(this.getUrl(options), (function(_this) {
        return function(response, err) {
          var data;
          if (err) {
            return fn(null, err);
          } else {
            data = _this.lastOriginalData = XmlParser(response.data);
            try {
              data = _this.parse(data);
              return fn(data, null);
            } catch (_error) {
              err = _error;
              return fn(null, err);
            }
          }
        };
      })(this));
      return new FakePromise;
    };

    Ares.prototype.findByIdentification = function(identification, limitOrFn, fn) {
      var args;
      if (limitOrFn == null) {
        limitOrFn = 10;
      }
      if (fn == null) {
        fn = null;
      }
      args = this.normalizeArguments(limitOrFn, fn);
      if (Validators.companyIdentification(identification) === false) {
        args.fn(null, new Error('Company identification is not valid'));
        return new FakePromise;
      }
      return this.find('ico', identification, args.fn, args.limit, 'ico');
    };

    Ares.prototype.findByCompanyName = function(name, limitOrFn, fn) {
      var args;
      if (limitOrFn == null) {
        limitOrFn = 10;
      }
      if (fn == null) {
        fn = null;
      }
      args = this.normalizeArguments(limitOrFn, fn);
      return this.find('obchodni_firma', name, args.fn, args.limit, 'of');
    };

    Ares.prototype.getUrl = function(options) {
      options = http.Helpers.buildQuery(options);
      return this.url + '?' + options;
    };

    Ares.prototype.parse = function(data) {
      var child, error, i, j, k, len, len1, len2, ref, result;
      data = data.root.children[0].children;
      for (i = 0, len = data.length; i < len; i++) {
        child = data[i];
        if (child.name === 'are:Error') {
          ref = child.children;
          for (j = 0, len1 = ref.length; j < len1; j++) {
            error = ref[j];
            if (error.name === 'dtt:Error_text') {
              throw new Error(error.content);
            }
          }
          throw new Error;
        }
      }
      result = {
        length: 0,
        data: []
      };
      for (k = 0, len2 = data.length; k < len2; k++) {
        child = data[k];
        if (child.name === 'are:Pocet_zaznamu') {
          result.length = parseInt(child.content);
        } else if (child.name === 'are:Zaznam') {
          result.data.push(this.parseItem(child.children));
        }
      }
      return result;
    };

    Ares.prototype.parseItem = function(item) {
      var address, child, i, identification, j, k, len, len1, len2, ref, ref1, result;
      result = {
        created: null,
        validity: null,
        name: null,
        identification: null,
        address: {
          district: null,
          city: null,
          street: null,
          descriptionNumber: null,
          orientationNumber: null,
          zipCode: null
        }
      };
      for (i = 0, len = item.length; i < len; i++) {
        child = item[i];
        switch (child.name) {
          case 'are:Datum_vzniku':
            result.created = new Date(child.content);
            break;
          case 'are:Datum_platnosti':
            result.validity = new Date(child.content);
            break;
          case 'are:Obchodni_firma':
            result.name = child.content;
            break;
          case 'are:ICO':
            result.identification = parseInt(child.content);
            break;
          case 'are:Identifikace':
            ref = child.children;
            for (j = 0, len1 = ref.length; j < len1; j++) {
              identification = ref[j];
              if (identification.name === 'are:Adresa_ARES') {
                ref1 = identification.children;
                for (k = 0, len2 = ref1.length; k < len2; k++) {
                  address = ref1[k];
                  switch (address.name) {
                    case 'dtt:Nazev_okresu':
                      result.address.district = address.content;
                      break;
                    case 'dtt:Nazev_obce':
                      result.address.city = address.content;
                      break;
                    case 'dtt:Nazev_ulice':
                      result.address.street = address.content;
                      break;
                    case 'dtt:Cislo_domovni':
                      result.address.descriptionNumber = parseInt(address.content);
                      break;
                    case 'dtt:Cislo_orientacni':
                      result.address.orientationNumber = address.content;
                      break;
                    case 'dtt:PSC':
                      result.address.zipCode = parseInt(address.content);
                  }
                }
              }
            }
        }
      }
      return result;
    };

    Ares.prototype.normalizeArguments = function(limitOrFn, fn) {
      var limit;
      if (limitOrFn == null) {
        limitOrFn = 10;
      }
      if (fn == null) {
        fn = null;
      }
      if (Object.prototype.toString.call(limitOrFn) === '[object Function]') {
        fn = limitOrFn;
        limit = 10;
      } else {
        limit = limitOrFn;
      }
      if (fn === null) {
        throw new Error('Please, set callback');
      }
      return {
        limit: limit,
        fn: fn
      };
    };

    return Ares;

  })();

  module.exports = Ares;

}).call(this);
