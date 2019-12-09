import hashlib

file_path = 'C:\\temp\\test\\fax-20191011160900.pdf'

BLOCK_SIZE = 6553600000  # The size of each read from the file

file_hash = hashlib.sha256()  # Create the hash object, can use something other than `.sha256()` if you wish
with open(file_path, 'rb') as f:  # Open the file to read it's bytes
    fb = f.read(BLOCK_SIZE)  # Read from the file. Take in the amount declared above
    while len(fb) > 0:  # While there is still data being read from the file
        file_hash.update(fb)  # Update the hash
        fb = f.read(BLOCK_SIZE)  # Read the next block from the file

this_file_hash = file_hash.hexdigest()

print(this_file_hash)