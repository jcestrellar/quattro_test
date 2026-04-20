/*
 * Copyright 2009-2010 Cybozu Labs, Inc.
 * Copyright 2011-2014 Kazuho Oku
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
#ifndef picojson_h
#define picojson_h

#include <algorithm>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <iterator>
#include <limits>
#include <map>
#include <stdexcept>
#include <string>
#include <vector>

// for isnan/isinf
#if __cplusplus>=201103L
# include <cmath>
#else
extern "C" {
# ifdef _MSC_VER
#  include <float.h>
# elif defined(__INTEL_COMPILER)
#  include <mathimf.h>
# else
#  include <math.h>
# endif
}
#endif

#ifndef PICOJSON_ASSERT
# define PICOJSON_ASSERT(e) do { if (! (e)) throw std::runtime_error(#e); } while (0)
#endif

#ifdef _MSC_VER
    #define SNPRINTF _snwprintf_s
    #pragma warning(push)
    #pragma warning(disable : 4244) // conversion from int to char
    #pragma warning(disable : 4127) // conditional expression is constant
    #pragma warning(disable : 4702) // unreachable code
#else
    #define SNPRINTF snprintf
#endif

namespace picojson {

  enum {
    null_type,
    boolean_type,
    number_type,
    string_type,
    array_type,
    object_type
  };

  enum {
    INDENT_WIDTH = 2
  };

  struct null {};

  class value {
  public:
    typedef std::vector<value> array;
    typedef std::map<std::wstring, value> object;
    union _storage {
      bool boolean_;
      double number_;
      std::wstring* string_;
      array* array_;
      object* object_;
    };
  protected:
    int type_;
    _storage u_;
  public:
    value();
    value(int type, bool);
    explicit value(bool b);
    explicit value(double n);
    explicit value(const std::wstring& s);
    explicit value(const array& a);
    explicit value(const object& o);
    explicit value(const wchar_t* s);
    value(const wchar_t* s, size_t len);
    ~value();
    value(const value& x);
    value& operator=(const value& x);
    void swap(value& x);
    template <typename T> bool is() const;
    template <typename T> const T& get() const;
    template <typename T> T& get();
    bool evaluate_as_boolean() const;
    const value& get(size_t idx) const;
    const value& get(const std::wstring& key) const;
    value& get(size_t idx);
    value& get(const std::wstring& key);

    bool contains(size_t idx) const;
    bool contains(const std::wstring& key) const;
    std::wstring to_str() const;
    template <typename Iter> void serialize(Iter os, bool prettify = false) const;
    std::wstring serialize(bool prettify = false) const;
  private:
    template <typename T> value(const T*); // intentionally defined to block implicit conversion of pointer to bool
    template <typename Iter> static void _indent(Iter os, int indent);
    template <typename Iter> void _serialize(Iter os, int indent) const;
    std::wstring _serialize(int indent) const;
  };

  typedef value::array array;
  typedef value::object object;

  inline value::value() : type_(null_type) {}

  inline value::value(int type, bool) : type_(type) {
    switch (type) {
#define INIT(p, v) case p##type: u_.p = v; break
      INIT(boolean_, false);
      INIT(number_, 0.0);
      INIT(string_, new std::wstring());
      INIT(array_, new array());
      INIT(object_, new object());
#undef INIT
    default: break;
    }
  }

  inline value::value(bool b) : type_(boolean_type) {
    u_.boolean_ = b;
  }

  inline value::value(double n) : type_(number_type) {
    if (
#ifdef _MSC_VER
        ! _finite(n)
#elif __cplusplus>=201103L || !(defined(isnan) && defined(isinf))
                std::isnan(n) || std::isinf(n)
#else
        isnan(n) || isinf(n)
#endif
        ) {
      throw std::overflow_error("");
    }
    u_.number_ = n;
  }

  inline value::value(const std::wstring& s) : type_(string_type) {
    u_.string_ = new std::wstring(s);
  }

  inline value::value(const array& a) : type_(array_type) {
    u_.array_ = new array(a);
  }

  inline value::value(const object& o) : type_(object_type) {
    u_.object_ = new object(o);
  }

  inline value::value(const wchar_t* s) : type_(string_type) {
    u_.string_ = new std::wstring(s);
  }

  inline value::value(const wchar_t* s, size_t len) : type_(string_type) {
    u_.string_ = new std::wstring(s, len);
  }

  inline value::~value() {
    switch (type_) {
#define DEINIT(p) case p##type: delete u_.p; break
      DEINIT(string_);
      DEINIT(array_);
      DEINIT(object_);
#undef DEINIT
    default: break;
    }
  }

  inline value::value(const value& x) : type_(x.type_) {
    switch (type_) {
#define INIT(p, v) case p##type: u_.p = v; break
      INIT(string_, new std::wstring(*x.u_.string_));
      INIT(array_, new array(*x.u_.array_));
      INIT(object_, new object(*x.u_.object_));
#undef INIT
    default:
      u_ = x.u_;
      break;
    }
  }

  inline value& value::operator=(const value& x) {
    if (this != &x) {
      this->~value();
      new (this) value(x);
    }
    return *this;
  }

  inline void value::swap(value& x) {
    std::swap(type_, x.type_);
    std::swap(u_, x.u_);
  }

#define IS(ctype, jtype)                             \
  template <> inline bool value::is<ctype>() const { \
    return type_ == jtype##_type;                    \
  }
  IS(null, null)
  IS(bool, boolean)
  IS(std::wstring, string)
  IS(array, array)
  IS(object, object)
#undef IS
  template <> inline bool value::is<double>() const {
    return type_ == number_type;
  }

#define GET(ctype, var)                                         \
  template <> inline const ctype& value::get<ctype>() const {   \
    PICOJSON_ASSERT(L"type mismatch! call is<type>() before get<type>()" \
           && is<ctype>());                                     \
    return var;                                                 \
  }                                                             \
  template <> inline ctype& value::get<ctype>() {               \
    PICOJSON_ASSERT(L"type mismatch! call is<type>() before get<type>()" \
           && is<ctype>());                                     \
    return var;                                                 \
  }
  GET(bool, u_.boolean_)
  GET(std::wstring, *u_.string_)
  GET(array, *u_.array_)
  GET(object, *u_.object_)
  GET(double, u_.number_)
#undef GET

  inline bool value::evaluate_as_boolean() const {
    switch (type_) {
    case null_type:
      return false;
    case boolean_type:
      return u_.boolean_;
    case number_type:
      return u_.number_ != 0;
    case string_type:
      return ! u_.string_->empty();
    default:
      return true;
    }
  }

  inline const value& value::get(size_t idx) const {
    static value s_null;
    PICOJSON_ASSERT(is<array>());
    return idx < u_.array_->size() ? (*u_.array_)[idx] : s_null;
  }

  inline value& value::get(size_t idx) {
    static value s_null;
    PICOJSON_ASSERT(is<array>());
    return idx < u_.array_->size() ? (*u_.array_)[idx] : s_null;
  }

  inline const value& value::get(const std::wstring& key) const {
    static value s_null;
    PICOJSON_ASSERT(is<object>());
    object::const_iterator i = u_.object_->find(key);
    return i != u_.object_->end() ? i->second : s_null;
  }

  inline value& value::get(const std::wstring& key) {
    static value s_null;
    PICOJSON_ASSERT(is<object>());
    object::iterator i = u_.object_->find(key);
    return i != u_.object_->end() ? i->second : s_null;
  }

  inline bool value::contains(size_t idx) const {
    PICOJSON_ASSERT(is<array>());
    return idx < u_.array_->size();
  }

  inline bool value::contains(const std::wstring& key) const {
    PICOJSON_ASSERT(is<object>());
    object::const_iterator i = u_.object_->find(key);
    return i != u_.object_->end();
  }

  inline std::wstring value::to_str() const {
    switch (type_) {
    case null_type:      return L"null";
    case boolean_type:   return u_.boolean_ ? L"true" : L"false";
    case number_type:    {
      wchar_t buf[256];
      double tmp;
      SNPRINTF(buf, sizeof(buf)/sizeof(wchar_t), fabs(u_.number_) < (1ULL << 53) && modf(u_.number_, &tmp) == 0 ? L"%.f" : L"%.17g", u_.number_);
      return buf;
    }
    case string_type:    return *u_.string_;
    case array_type:     return L"array";
    case object_type:    return L"object";
    default:             PICOJSON_ASSERT(0);
#ifdef _MSC_VER
      __assume(0);
#endif
    }
    return std::wstring();
  }

  template <typename Iter> void copy(const std::wstring& s, Iter oi) {
    std::copy(s.begin(), s.end(), oi);
  }

  template <typename Iter> void serialize_str(const std::wstring& s, Iter oi) {
    *oi++ = L'"';
    for (std::wstring::const_iterator i = s.begin(); i != s.end(); ++i) {
      switch (*i) {
#define MAP(val, sym) case val: copy(sym, oi); break
        MAP(L'"', L"\\\"");
        MAP(L'\\', L"\\\\");
        MAP(L'/', L"\\/");
        MAP(L'\b', L"\\b");
        MAP(L'\f', L"\\f");
        MAP(L'\n', L"\\n");
        MAP(L'\r', L"\\r");
        MAP(L'\t', L"\\t");
#undef MAP
      default:
        *oi++ = *i;
        break;
      }
    }
    *oi++ = L'"';
  }

  template <typename Iter> void value::serialize(Iter oi, bool prettify) const {
    return _serialize(oi, prettify ? 0 : -1);
  }

  inline std::wstring value::serialize(bool prettify) const {
    return _serialize(prettify ? 0 : -1);
  }

  template <typename Iter> void value::_indent(Iter oi, int indent) {
    *oi++ = L'\n';
    for (int i = 0; i < indent * INDENT_WIDTH; ++i) {
      *oi++ = L' ';
    }
  }

  template <typename Iter> void value::_serialize(Iter oi, int indent) const {
    switch (type_) {
    case string_type:
      serialize_str(*u_.string_, oi);
      break;
    case array_type: {
      *oi++ = L'[';
      if (indent != -1) {
        ++indent;
      }
      for (array::const_iterator i = u_.array_->begin();
           i != u_.array_->end();
           ++i) {
        if (i != u_.array_->begin()) {
          *oi++ = L',';
        }
        if (indent != -1) {
          _indent(oi, indent);
        }
        i->_serialize(oi, indent);
      }
      if (indent != -1) {
        --indent;
        if (! u_.array_->empty()) {
          _indent(oi, indent);
        }
      }
      *oi++ = L']';
      break;
    }
    case object_type: {
      *oi++ = L'{';
      if (indent != -1) {
        ++indent;
      }
      for (object::const_iterator i = u_.object_->begin();
           i != u_.object_->end();
           ++i) {
        if (i != u_.object_->begin()) {
          *oi++ = L',';
        }
        if (indent != -1) {
          _indent(oi, indent);
        }
        serialize_str(i->first, oi);
        *oi++ = L':';
        if (indent != -1) {
          *oi++ = L' ';
        }
        i->second._serialize(oi, indent);
      }
      if (indent != -1) {
        --indent;
        if (! u_.object_->empty()) {
          _indent(oi, indent);
        }
      }
      *oi++ = L'}';
      break;
    }
    default:
      copy(to_str(), oi);
      break;
    }
    if (indent == 0) {
      *oi++ = L'\n';
    }
  }

  inline std::wstring value::_serialize(int indent) const {
    std::wstring s;
    _serialize(std::back_inserter(s), indent);
    return s;
  }

  template <typename Iter> class input {
  protected:
    Iter cur_, end_;
    int last_ch_;
    bool ungot_;
    int line_;
  public:
    input(const Iter& first, const Iter& last) : cur_(first), end_(last), last_ch_(-1), ungot_(false), line_(1) {}
    int getc() {
      if (ungot_) {
        ungot_ = false;
        return last_ch_;
      }
      if (cur_ == end_) {
        last_ch_ = -1;
        return -1;
      }
      if (last_ch_ == L'\n') {
        line_++;
      }
      last_ch_ = *cur_ & 0xffff;
      ++cur_;
      return last_ch_;
    }
    void ungetc() {
      if (last_ch_ != -1) {
        PICOJSON_ASSERT(! ungot_);
        ungot_ = true;
      }
    }
    Iter cur() const { return cur_; }
    int line() const { return line_; }
    void skip_ws() {
      while (1) {
        int ch = getc();
        if (! (ch == L' ' || ch == L'\t' || ch == L'\n' || ch == L'\r')) {
          ungetc();
          break;
        }
      }
    }
    bool expect(int expect) {
      skip_ws();
      if (getc() != expect) {
        ungetc();
        return false;
      }
      return true;
    }
    bool match(const std::wstring& pattern) {
      for (std::wstring::const_iterator pi(pattern.begin());
           pi != pattern.end();
           ++pi) {
        if (getc() != *pi) {
          ungetc();
          return false;
        }
      }
      return true;
    }
  };

  template<typename Iter> inline int _parse_quadhex(input<Iter> &in) {
    int uni_ch = 0, hex;
    for (int i = 0; i < 4; i++) {
      if ((hex = in.getc()) == -1) {
        return -1;
      }
      if (L'0' <= hex && hex <= L'9') {
        hex -= L'0';
      } else if (L'A' <= hex && hex <= L'F') {
        hex -= L'A' - 0xa;
      } else if (L'a' <= hex && hex <= L'f') {
        hex -= L'a' - 0xa;
      } else {
        in.ungetc();
        return -1;
      }
      uni_ch = uni_ch * 16 + hex;
    }
    return uni_ch;
  }

  template<typename String, typename Iter> inline bool _parse_codepoint(String& out, input<Iter>& in) {
    int uni_ch;
    if ((uni_ch = _parse_quadhex(in)) == -1) {
      return false;
    }
    if (0xd800 <= uni_ch && uni_ch <= 0xdfff) {
      if (0xdc00 <= uni_ch) {
        // a second 16-bit of a surrogate pair appeared
        return false;
      }
      // first 16-bit of surrogate pair, get the next one
      if (in.getc() != L'\\' || in.getc() != L'u') {
        in.ungetc();
        return false;
      }
      int second = _parse_quadhex(in);
      if (! (0xdc00 <= second && second <= 0xdfff)) {
        return false;
      }
      uni_ch = ((uni_ch - 0xd800) << 10) | ((second - 0xdc00) & 0x3ff);
      uni_ch += 0x10000;
    }
    if (uni_ch < 0x80) {
      out.push_back(uni_ch);
    } else {
      if (uni_ch < 0x800) {
        out.push_back(0xc0 | (uni_ch >> 6));
      } else {
        if (uni_ch < 0x10000) {
          out.push_back(0xe0 | (uni_ch >> 12));
        } else {
          out.push_back(0xf0 | (uni_ch >> 18));
          out.push_back(0x80 | ((uni_ch >> 12) & 0x3f));
        }
        out.push_back(0x80 | ((uni_ch >> 6) & 0x3f));
      }
      out.push_back(0x80 | (uni_ch & 0x3f));
    }
    return true;
  }

  template<typename String, typename Iter> inline bool _parse_string(String& out, input<Iter>& in) {
    while (1) {
      int ch = in.getc();
      if (ch < L' ') {
        in.ungetc();
        return false;
      } else if (ch == L'"') {
        return true;
      } else if (ch == L'\\') {
        if ((ch = in.getc()) == -1) {
          return false;
        }
        switch (ch) {
#define MAP(sym, val) case sym: out.push_back(val); break
          MAP(L'"', L'\"');
          MAP(L'\\', L'\\');
          MAP(L'/', L'/');
          MAP(L'b', L'\b');
          MAP(L'f', L'\f');
          MAP(L'n', L'\n');
          MAP(L'r', L'\r');
          MAP(L't', L'\t');
#undef MAP
        case L'u':
          if (! _parse_codepoint(out, in)) {
            return false;
          }
          break;
        default:
          return false;
        }
      } else {
        out.push_back(ch);
      }
    }
    return false;
  }

  template <typename Context, typename Iter> inline bool _parse_array(Context& ctx, input<Iter>& in) {
    if (! ctx.parse_array_start()) {
      return false;
    }
    size_t idx = 0;
    if (in.expect(L']')) {
      return ctx.parse_array_stop(idx);
    }
    do {
      if (! ctx.parse_array_item(in, idx)) {
        return false;
      }
      idx++;
    } while (in.expect(L','));
    return in.expect(L']') && ctx.parse_array_stop(idx);
  }

  template <typename Context, typename Iter> inline bool _parse_object(Context& ctx, input<Iter>& in) {
    if (! ctx.parse_object_start()) {
      return false;
    }
    if (in.expect(L'}')) {
      return true;
    }
    do {
      std::wstring key;
      if (! in.expect(L'"')
          || ! _parse_string(key, in)
          || ! in.expect(L':')) {
        return false;
      }
      if (! ctx.parse_object_item(in, key)) {
        return false;
      }
    } while (in.expect(L','));
    return in.expect(L'}');
  }

  template <typename Iter> inline std::wstring _parse_number(input<Iter>& in) {
    std::wstring num_str;
    while (1) {
      int ch = in.getc();
      if ((L'0' <= ch && ch <= L'9') || ch == L'+' || ch == L'-' || ch == L'e' || ch == L'E') {
        num_str.push_back(ch);
      } else if (ch == L'.') {
        num_str.push_back(L'.');
      } else {
        in.ungetc();
        break;
      }
    }
    return num_str;
  }

  template <typename Context, typename Iter> inline bool _parse(Context& ctx, input<Iter>& in) {
    in.skip_ws();
    int ch = in.getc();
    switch (ch) {
#define IS(ch, text, op) case ch: \
      if (in.match(text) && op) { \
        return true; \
      } else { \
        return false; \
      }
      IS(L'n', L"ull", ctx.set_null());
      IS(L'f', L"alse", ctx.set_bool(false));
      IS(L't', L"rue", ctx.set_bool(true));
#undef IS
    case L'"':
      return ctx.parse_string(in);
    case L'[':
      return _parse_array(ctx, in);
    case L'{':
      return _parse_object(ctx, in);
    default:
      if ((L'0' <= ch && ch <= L'9') || ch == L'-') {
        double f;
        wchar_t *endp;
        in.ungetc();
        std::wstring num_str = _parse_number(in);
        if (num_str.empty()) {
          return false;
        }
        f = wcstod(num_str.c_str(), &endp);
        if (endp == num_str.c_str() + num_str.size()) {
          ctx.set_number(f);
          return true;
        }
        return false;
      }
      break;
    }
    in.ungetc();
    return false;
  }

  class deny_parse_context {
  public:
    bool set_null() { return false; }
    bool set_bool(bool) { return false; }
    bool set_number(double) { return false; }
    template <typename Iter> bool parse_string(input<Iter>&) { return false; }
    bool parse_array_start() { return false; }
    template <typename Iter> bool parse_array_item(input<Iter>&, size_t) {
      return false;
    }
    bool parse_array_stop(size_t) { return false; }
    bool parse_object_start() { return false; }
    template <typename Iter> bool parse_object_item(input<Iter>&, const std::wstring&) {
      return false;
    }
  };

  class default_parse_context {
  protected:
    value* out_;
  public:
    default_parse_context(value* out) : out_(out) {}
    bool set_null() {
      *out_ = value();
      return true;
    }
    bool set_bool(bool b) {
      *out_ = value(b);
      return true;
    }
    bool set_number(double f) {
      *out_ = value(f);
      return true;
    }
    template<typename Iter> bool parse_string(input<Iter>& in) {
      *out_ = value(string_type, false);
      return _parse_string(out_->get<std::wstring>(), in);
    }
    bool parse_array_start() {
      *out_ = value(array_type, false);
      return true;
    }
    template <typename Iter> bool parse_array_item(input<Iter>& in, size_t) {
      array& a = out_->get<array>();
      a.push_back(value());
      default_parse_context ctx(&a.back());
      return _parse(ctx, in);
    }
    bool parse_array_stop(size_t) { return true; }
    bool parse_object_start() {
      *out_ = value(object_type, false);
      return true;
    }
    template <typename Iter> bool parse_object_item(input<Iter>& in, const std::wstring& key) {
      object& o = out_->get<object>();
      default_parse_context ctx(&o[key]);
      return _parse(ctx, in);
    }
  private:
    default_parse_context(const default_parse_context&);
    default_parse_context& operator=(const default_parse_context&);
  };

  class null_parse_context {
  public:
    struct dummy_str {
      void push_back(int) {}
    };
  public:
    null_parse_context() {}
    bool set_null() { return true; }
    bool set_bool(bool) { return true; }
    bool set_number(double) { return true; }
    template <typename Iter> bool parse_string(input<Iter>& in) {
      dummy_str s;
      return _parse_string(s, in);
    }
    bool parse_array_start() { return true; }
    template <typename Iter> bool parse_array_item(input<Iter>& in, size_t) {
      return _parse(*this, in);
    }
    bool parse_array_stop(size_t) { return true; }
    bool parse_object_start() { return true; }
    template <typename Iter> bool parse_object_item(input<Iter>& in, const std::wstring&) {
      return _parse(*this, in);
    }
  private:
    null_parse_context(const null_parse_context&);
    null_parse_context& operator=(const null_parse_context&);
  };

  // obsolete, use the version below
  template <typename Iter> inline std::wstring parse(value& out, Iter& pos, const Iter& last) {
    std::wstring err;
    pos = parse(out, pos, last, &err);
    return err;
  }

  template <typename Context, typename Iter> inline Iter _parse(Context& ctx, const Iter& first, const Iter& last, std::wstring* err) {
    input<Iter> in(first, last);
    if (! _parse(ctx, in) && err != NULL) {
      wchar_t buf[64];
      SNPRINTF(buf, sizeof(buf)/sizeof(wchar_t), L"syntax error at line %d near: ", in.line());
      *err = buf;
      while (1) {
        int ch = in.getc();
        if (ch == -1 || ch == L'\n') {
          break;
        } else if (ch >= L' ') {
          err->push_back(ch);
        }
      }
    }
    return in.cur();
  }

  template <typename Iter> inline Iter parse(value& out, const Iter& first, const Iter& last, std::wstring* err) {
    default_parse_context ctx(&out);
    return _parse(ctx, first, last, err);
  }

  inline std::wstring parse(value& out, const std::wstring& s) {
    std::wstring err;
    parse(out, s.begin(), s.end(), &err);
    return err;
  }

  template <typename T> struct last_error_t {
    static std::wstring s;
  };
  template <typename T> std::wstring last_error_t<T>::s;

  inline void set_last_error(const std::wstring& s) {
    last_error_t<bool>::s = s;
  }

  inline const std::wstring& get_last_error() {
    return last_error_t<bool>::s;
  }

  inline bool operator==(const value& x, const value& y) {
    if (x.is<null>())
      return y.is<null>();
#define PICOJSON_CMP(type)                                      \
    if (x.is<type>())                                           \
      return y.is<type>() && x.get<type>() == y.get<type>()
    PICOJSON_CMP(bool);
    PICOJSON_CMP(double);
    PICOJSON_CMP(std::wstring);
    PICOJSON_CMP(array);
    PICOJSON_CMP(object);
#undef PICOJSON_CMP
    PICOJSON_ASSERT(0);
#ifdef _MSC_VER
    __assume(0);
#endif
    return false;
  }

  inline bool operator!=(const value& x, const value& y) {
    return ! (x == y);
  }
}

namespace std {
  template<> inline void swap(picojson::value& x, picojson::value& y)
    {
      x.swap(y);
    }
}

#ifdef _MSC_VER
    #pragma warning(pop)
#endif

#endif
