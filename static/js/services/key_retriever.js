/** @format */
// mst_giu=['VnhZVXJvWW0=', 'dVteU243clU=', 'eXpvWUleXm8=', 'XWtrb3lTOlM=']
// mst_ipt=['S0ZaeFJ4W0s=', 'WHw6bFw6VEo=', 'cHtaX0pfNm8=', 'aE5cS3FVbzk=']

const keys = {
  gemini: ['Rk5/Zlh+Rjs=', 'f3B1fmxka2w=', 'XjlUfU8ydnQ=', 'aE41PnxcVlw=', 'VH49RzlXcA=='],
  mistral: ['VnhZVXJvWW0=', 'dVteU243clU=', 'eXpvWUleXm8=', 'XWtrb3lTOlM='],
  groq: ['bHhwZHp5WlU=', 'VX9JS0p8TFM=', 'eVl6XX9dPno=', 'XExpfmc4S14=', 'aVVOdX1vb3g=', 'VHVsNjxZbW8=', 'XWt3SGh+R2w='],
  huggingface: ['bWtkVndLdnw=', 'aV59e3hGfEo=', 'aHNJd2lIW2g=', 'TEteWk9bVVU=', 'SktKSmY=']
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