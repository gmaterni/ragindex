import re


def split_text(text: str,
               min_chunk_size: int,
               max_chunk_size: int) -> list[str]:
    """
    Suddivide un testo in chunk secondo le regole:
    - Ogni chunk deve avere dimensione compresa tra min_chunk_size e max_chunk_size.
    - Divisione preferita su punteggiatura forte (.?!).
    - Se non si trova punteggiatura entro max_chunk_size, si taglia sull'ultima parola intera.
    - Se l'ultimo chunk è troppo corto, viene unito al penultimo e poi diviso in due chunk bilanciati.
    """

    def find_split_point(segment: str,
                         min_size: int,
                         max_size: int) -> int:
        """Trova il miglior punto di split nel range consentito."""
        if len(segment) <= max_size:
            return len(segment)

        candidate = segment.rfind('.', min_size, max_size + 1)
        if candidate == -1:
            candidate = segment.rfind('?', min_size, max_size + 1)
        if candidate == -1:
            candidate = segment.rfind('!', min_size, max_size + 1)

        if candidate != -1:
            return candidate + 1  # includo il carattere di punteggiatura

        # fallback: ultima parola intera prima del max
        candidate = segment.rfind(' ', min_size, max_size + 1)
        if candidate == -1:
            return max_size
        return candidate

    chunks = []
    start = 0
    n = len(text)

    while start < n:
        remaining = text[start:]
        if len(remaining) <= max_chunk_size:
            chunks.append(remaining.strip())
            break
        split_idx = find_split_point(remaining, min_chunk_size, max_chunk_size)
        chunks.append(remaining[:split_idx].strip())
        start += split_idx

    # gestione ultimo chunk troppo corto
    if len(chunks) > 1 and len(chunks[-1]) < min_chunk_size:
        last = chunks.pop()
        prev = chunks.pop()
        combined = (prev + " " + last).strip()

        mid = len(combined) // 2

        # cerca punteggiatura vicino al centro
        left_split = max(combined.rfind('.', 0, mid),
                         combined.rfind('?', 0, mid),
                         combined.rfind('!', 0, mid))
        if left_split == -1:
            left_split = combined.rfind(' ', 0, mid)
        if left_split == -1:
            left_split = mid

        chunk1 = combined[:left_split+1].strip()
        chunk2 = combined[left_split+1:].strip()

        if chunk1 and chunk2:
            chunks.extend([chunk1, chunk2])
        else:
            chunks.append(combined)

    return chunks
