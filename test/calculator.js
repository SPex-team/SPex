const ONE_ETHER = 1e18;
const principal = 10 * ONE_ETHER;
const duration = (30 * (43812 + 184923)) / (86400 * 365);
// const duration = 1
const annual = 0.1;

function getPrincipalInterest(principal, duration, annual) {
  return principal * Math.E ** (annual * duration);
}

function getInterest(principal, duration, annual) {
  return principal * Math.E ** (annual * duration) - principal;
}

// let principalInterest = getPrincipalInterest(principal, duration, annual)

// console.log("principalInterest: ", principalInterest)

console.log(
  getPrincipalInterest(10e18, (43812 + 184923 * 30) / (86400 * 365), 0.1)
);

console.log(getPrincipalInterest(20e18, (184923 * 30) / (86400 * 365), 0.1));

// console.log(getPrincipalInterest(10e18, 1, 0.1))


console.log(getInterest(20e18, (43231 + 43231 + 184923) * 30 / 31536000, 0.1))

  
