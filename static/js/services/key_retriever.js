/** @format */

// const anthropic=['eHAyZnN5MmY=', 'dW41ODJXcHA=', 'Xlp7N2s6c1s=', 'OX89VH1MdHA=', 'f2lpVn9tc30=', 'MmdQcWc7Nz4=', 'SX1ucn9dU0o=', 'PmQ9d2tGen4=', 'MjtmU09McmY=', 'ZH5yaFJwfm8=', 'STJcaHxZfH4=', 'fVxyOD12OXQ=', 'PkdGMjs2emg=', 'PWxGRg==']

// const deep=['eHAyaWlnOD4=', 'NTk+N2s6ajk=', 'aWc7PjlmZmk=', 'PT03OGg4aWk=', 'ODc1']

// const gemini_gab=['Rk5/Zlh+SXc=', 'Nng4dFN7alw=', 'bTxQT15adU8=', 'ajZfaDJMa2Q=', 'ZHlWclZMRg==']
// const gemini_giu=['Rk5/Zlh+R0s=', 'X3xmXX1uWWw=', 'V2Y9fF07Ukk=', 'X1pWbFlGMnk=', 'OzxfT151cA==']
// const gemini_gm=['Rk5/Zlh+SFc=', 'NldcTzxtOm8=', 'S3heTTtwVns=', 'eU5ReT5LSj4=', 'WF9+VVp/Tg==']
// const gemini_rgq1=['Rk5/Zlh+SFw=', 'Nm19VUg3cXg=', 'OHdkbUlRalg=', 'X1xPeW86TW0=', 'cV5cU211Xg==']
// XXX     const gemini_rgq7=['Rk5/Zlh+R2g=', 'eHs1blxRZGg=', 'XTsyOTVqVnw=', 'TlVobGt3WjI=', 'OnVJRkp0OQ==']

// const groq=['bHhwZHp5WlU=', 'VX9JS0p8TFM=', 'eVl6XX9dPno=', 'XExpfmc4S14=', 'aVVOdX1vb3g=', 'VHVsNjxZbW8=', 'XWt3SGh+R2w=']

// const hf=['bWtkanZ9UHM=', 'V1xLWF5bfUc=', 'R1ZQellXeUY=', 'SF5RclVRak4=', 'fmlXfXw=']

//XXX const mistral_giu=['VnhZVXJvWW0=', 'dVteU243clU=', 'eXpvWUleXm8=', 'XWtrb3lTOlM=']
// const mistral_rgn=['bmdvd39PTns=', 'XXRJbzU7fm0=', 'VXh3Uk1rdHg=', 'Pk9/X2l0cDg=']
// const mistral_ua=['eTt3NTlbWm8=', 'TGxWTX0+R18=', 'aVhGclZtXGY=', 'OUtxfTdudG4=']
 
 
const keys = {
  gemini: ['Rk5/Zlh+R2g=', 'eHs1blxRZGg=', 'XTsyOTVqVnw=', 'TlVobGt3WjI=', 'OnVJRkp0OQ=='],
  mistral: ['VnhZVXJvWW0=', 'dVteU243clU=', 'eXpvWUleXm8=', 'XWtrb3lTOlM='],
  groq: ['bHhwZHp5WlU=', 'VX9JS0p8TFM=', 'eVl6XX9dPno=', 'XExpfmc4S14=', 'aVVOdX1vb3g=', 'VHVsNjxZbW8=', 'XWt3SGh+R2w='],
  huggingface: ['bWtkanZ9UHM=', 'V1xLWF5bfUc=', 'R1ZQellXeUY=', 'SF5RclVRak4=', 'fmlXfXw=']
}

function umgm(arr) {
  if (!arr) return null;
  return arr
    .map((part) => {
      const ch = atob(part); // Decodifica da Base64
      return ch
        .split("")
        .map((char) => String.fromCharCode((char.charCodeAt(0) - 5 + 256) % 256)) // Applica lo shift
        .join("");
    })
    .join("");
}

export function getApiKey(provider) {
  const lowerCaseProvider = provider.toLowerCase();
  const encodedKeyArray = keys[lowerCaseProvider];
  if (!encodedKeyArray) {
    console.error(`Nessun array di chiavi trovato per il provider: ${provider}`);
    return null;
  }
  return umgm(encodedKeyArray);
}


// export const KeyRetriever = {
//   getApiKey: (provider) => {
//     const lowerCaseProvider = provider.toLowerCase();
//     const encodedKeyArray = keys[lowerCaseProvider];
//     if (!encodedKeyArray) {
//       console.error(`Nessun array di chiavi trovato per il provider: ${provider}`);
//       return null;
//     }
//     return umgm(encodedKeyArray);
//   }
// };