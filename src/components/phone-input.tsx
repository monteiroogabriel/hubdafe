"use client";

import { useMemo, useState } from "react";
import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

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
  const [country, setCountry] = useState<CountryCode>("BR");
  const [value, setValue] = useState("");

  const internationalNumber = useMemo(() => {
    const parsed = parsePhoneNumberFromString(value, country);
    return parsed?.isValid() ? parsed.number : "";
  }, [country, value]);

  return (
    <div className="field">
      <label htmlFor="signup-phone">Telefone</label>
      <div className="phone-entry">
        <label className="sr-only" htmlFor="signup-phone-country">País do telefone</label>
        <select
          id="signup-phone-country"
          value={country}
          onChange={(event) => {
            setCountry(event.target.value as CountryCode);
            setValue("");
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
          type="tel"
          value={value}
          onChange={(event) => setValue(new AsYouType(country).input(event.target.value))}
          required
          maxLength={30}
          autoComplete="tel-national"
          placeholder="Número de telefone"
          aria-describedby="signup-phone-help"
        />
        <input type="hidden" name="phone" value={internationalNumber} />
      </div>
      <span className="fine" id="signup-phone-help">Escolha seu país e digite o telefone. O formato muda conforme o país escolhido.</span>
    </div>
  );
}
