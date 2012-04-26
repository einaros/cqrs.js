module.exports = {
  make: function(type, data) {
    return {
      type: type,
      data: data || {}
    }
  }
};