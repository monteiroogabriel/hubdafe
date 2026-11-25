"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

const displayNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });
const countryOptions = getCountries()
  .map((code) => ({
    code,
    name: displayNames.of(code) ?? code,
    callingCode: getCountryCallingCode(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

function flag(code: string) {
  return [...code].map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))).join("");
}

export function PhoneInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [country, setCountry] = useState<CountryCode>("BR");
  const [value, setValue] = useState("");

  const internationalNumber = useMemo(() => {
    const parsed = parsePhoneNumberFromString(value, country);
    return parsed?.isValid() ? parsed.number : "";
  }, [country, value]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(value && !internationalNumber ? "Informe um telefone válido para o país selecionado." : "");
  }, [value, internationalNumber]);

  return (
    <div className="field">
      <label htmlFor="signup-phone">Telefone</label>
      <div className="phone-entry">
        <label className="sr-only" htmlFor="signup-phone-country">País do telefone</label>
        <select
          id="signup-phone-country"
          name="phone_country"
          value={country}
          onChange={(event) => {
            setCountry(event.target.value as CountryCode);
            setValue(current => new AsYouType(event.target.value as CountryCode).input(current.replace(/\D/g, "")));
          }}
          autoComplete="country"
        >
          {countryOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {flag(option.code)} +{option.callingCode} {option.name}
            </option>
          ))}
        </select>
        <input
          id="signup-phone"
          ref={inputRef}
          name="phone"
          type="tel"
          value={value}
          onChange={(event) => setValue(new AsYouType(country).input(event.target.value))}
          required
          maxLength={30}
          autoComplete="tel-national"
          placeholder="Número de telefone"
        />
      </div>
    </div>
  );
}
