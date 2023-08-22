
# Seller
## Use lotus
### Set owner of Miner to SPex contract
```
./lotus-miner actor set-owner --really-do-it <contract t4 address> <old owner address>

# example
./lotus-miner actor set-owner --really-do-it t410fw6a457souoe7retym3trgejio5yl5abhi62eyzy t3swhgd3svmsvkzkmv3rjq6664pe3gkagnuoghycbz4bkfssice2icew2fglgv7qkbarcs65mgwefs76zzlfxq

### Call contract to accepet


./lotus evm CommonTypes.FilActorId minerId, bytes memory sign, uint256 timestamp