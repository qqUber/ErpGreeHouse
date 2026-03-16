import sqlite3

conn = sqlite3.connect('crm.db')
cursor = conn.cursor()

# Check counts
cursor.execute('SELECT COUNT(*) FROM customers')
customers = cursor.fetchone()[0]

cursor.execute('SELECT COUNT(*) FROM products')  
products = cursor.fetchone()[0]

cursor.execute('SELECT COUNT(*) FROM transactions')
transactions = cursor.fetchone()[0]

print(f'Customers: {customers}')
print(f'Products: {products}')
print(f'Transactions: {transactions}')

# Check sample data
cursor.execute('SELECT phone, full_name, qr_token FROM customers LIMIT 3')
sample_customers = cursor.fetchall()
print('\nSample customers:')
for customer in sample_customers:
    print(f'  {customer[1]} - QR: {customer[2]}')

# Check consents
cursor.execute('SELECT COUNT(*) FROM consents')
consents = cursor.fetchone()[0]
print(f'\nConsents: {consents}')

cursor.execute('SELECT consent_type, COUNT(*) FROM consents GROUP BY consent_type')
consent_types = cursor.fetchall()
print('Consent types:')
for consent_type, count in consent_types:
    print(f'  {consent_type}: {count}')

conn.close()
