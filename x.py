from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()

# The hash you provided
stored_hash = "$argon2id$v=19$m=65536,t=3,p=4$M0ZoDUEI4TxnLCXEmFNqrQ$EgOXLFbhew2xQQz0gPvlhjZ+T8oK/Ym/yrfgO67jZLc"

# The word you want to test
guess = input("Enter the word you think the hash represents: ")

try:
    ph.verify(stored_hash, guess)
    print("✨ Match found! That is the original text.")
except VerifyMismatchError:
    print("❌ No match. That word does not produce this hash.")
except Exception as e:
    print(f"Error: {e}")